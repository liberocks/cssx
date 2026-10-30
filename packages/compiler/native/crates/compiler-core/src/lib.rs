//! Shared Rust implementation for CSSX source analysis and style compilation.

use std::{
    collections::{HashMap, HashSet},
    path::Path,
    sync::Arc,
};

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, CallExpression, Declaration, ExportDeclaration, Expression, IdentifierReference,
    ImportDeclaration, ImportDeclarationSpecifier, ImportOrExportKind, ModuleExportName,
    ObjectPropertyKind, PropertyKey, PropertyKind, VariableDeclarator,
};
use oxc_ast_visit::{Visit, walk};
use oxc_parser::Parser;
use oxc_semantic::{Scoping, SemanticBuilder};
use oxc_span::SourceType;
use oxc_syntax::symbol::SymbolId;

/// The CSSX entry point associated with one imported binding.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum EntryPoint {
    /// `sx(...)` from the CSSX runtime.
    Sx,
    /// `create(...)` from the CSSX runtime.
    Create,
    /// `props(...)` from the CSSX runtime.
    Props,
}

impl EntryPoint {
    fn from_export_name(name: &str) -> Option<Self> {
        match name {
            "sx" => Some(Self::Sx),
            "create" => Some(Self::Create),
            "props" => Some(Self::Props),
            _ => None,
        }
    }
}

/// A CSSX call identified by Oxc's parser and resolved module bindings.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CssxCall {
    /// Recognized CSSX API entry point.
    pub entry_point: EntryPoint,
    /// UTF-8 byte offset of the complete call expression's start.
    pub start: u32,
    /// UTF-8 byte offset of the complete call expression's end.
    pub end: u32,
    /// UTF-16 code-unit offset of the complete call expression's start.
    pub start_utf16: u32,
    /// UTF-16 code-unit offset of the complete call expression's end.
    pub end_utf16: u32,
    /// One-based source line at the start of the call.
    pub line: u32,
    /// Zero-based UTF-16 column at the start of the call.
    pub column: u32,
    /// Whether every `sx()` argument can be folded without runtime expressions.
    pub static_sx: bool,
    /// Whether `create()` contains a static object of string utility values.
    pub static_create: bool,
    /// Whether every `props()` argument resolves to a known static style key.
    pub static_props: bool,
    /// Whether the module has one static map whose references are all static `props()` calls.
    pub fast_transform_safe: bool,
    /// Static utility strings accepted by the `sx()` argument grammar.
    pub utilities: Vec<String>,
    /// Literal style map entries returned for a static `create()` call.
    pub styles: Vec<CssxStyleEntry>,
    /// Style keys referenced by a static `props()` call.
    pub style_names: Vec<Arc<str>>,
}

/// One literal style entry extracted from `create({ name: 'utilities' })`.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CssxStyleEntry {
    /// Style key in the source object.
    pub name: String,
    /// Utility string assigned to the style key.
    pub utilities: String,
}

/// Source range of an import whose bindings are only used by calls that a static transform removes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CssxImportRange {
    /// UTF-8 byte offset of the import declaration start.
    pub start: u32,
    /// UTF-8 byte offset of the import declaration end.
    pub end: u32,
    /// UTF-16 code-unit offset of the import declaration start.
    pub start_utf16: u32,
    /// UTF-16 code-unit offset of the import declaration end.
    pub end_utf16: u32,
}

/// CSSX calls and import declarations that become unused after a static rewrite.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CssxModuleAnalysis {
    /// Calls found in the source module.
    pub calls: Vec<CssxCall>,
    /// Imports safe to remove when all returned calls are replaced.
    pub removable_imports: Vec<CssxImportRange>,
}

/// One in-memory source module passed to the bounded project analyzer.
#[derive(Clone, Copy, Debug)]
pub struct SourceModule<'a> {
    /// Source text retained by the caller.
    pub source: &'a str,
    /// Path used to select the JS/TS/JSX/TSX parser mode.
    pub filename: &'a str,
}

/// Parses a JS/TS module and finds calls through imported CSSX bindings.
///
/// The result is useful for the Rust transform pipeline: import aliases are
/// resolved by symbol identity, so shadowed local variables do not look like
/// CSSX calls. `import_source` defaults to `@cssxio/cssx` at the package layer.
pub fn find_cssx_calls(
    source: &str,
    filename: &str,
    import_source: &str,
) -> Result<Vec<CssxCall>, String> {
    analyze_cssx_module_with_import_tracking(source, filename, import_source, true, false)
        .map(|analysis| analysis.calls)
}

/// Finds CSSX calls without calculating per-call UTF-16 locations.
pub fn find_cssx_calls_without_positions(
    source: &str,
    filename: &str,
    import_source: &str,
) -> Result<Vec<CssxCall>, String> {
    analyze_cssx_module_with_import_tracking(source, filename, import_source, false, false)
        .map(|analysis| analysis.calls)
}

/// Analyzes CSSX calls and records imports that become unused when those calls are rewritten.
pub fn analyze_cssx_module(
    source: &str,
    filename: &str,
    import_source: &str,
    include_call_positions: bool,
) -> Result<CssxModuleAnalysis, String> {
    analyze_cssx_module_with_import_tracking(
        source,
        filename,
        import_source,
        include_call_positions,
        true,
    )
}

fn analyze_cssx_module_with_import_tracking(
    source: &str,
    filename: &str,
    import_source: &str,
    include_call_positions: bool,
    track_imports: bool,
) -> Result<CssxModuleAnalysis, String> {
    let allocator = Allocator::default();
    let parse_path = Path::new(filename.split('?').next().unwrap_or(filename));
    let source_type = SourceType::from_path(parse_path)
        .map_err(|_| format!("Unsupported source file extension: {filename}"))?;
    let parsed = Parser::new(&allocator, source, source_type).parse();
    if !parsed.diagnostics.is_empty() {
        return Err(format!(
            "Oxc could not parse {filename}: {:?}",
            parsed.diagnostics
        ));
    }
    let program = parsed.program;
    let semantic = SemanticBuilder::new_compiler().build(&program);
    if !semantic.diagnostics.is_empty() {
        return Err(format!(
            "Oxc could not analyze {filename}: {:?}",
            semantic.diagnostics
        ));
    }
    let scoping = semantic.semantic.into_scoping();
    let source_offsets = SourceOffsetIndex::new(source);
    let mut visitor = CssxCallCollector {
        import_source,
        source,
        source_offsets,
        include_call_positions,
        track_imports,
        scoping: &scoping,
        named_bindings: HashMap::new(),
        namespace_bindings: HashMap::new(),
        style_maps: HashMap::new(),
        exported_symbols: HashSet::new(),
        cssx_imports: Vec::new(),
        cssx_import_symbols: HashSet::new(),
        cssx_import_references: Vec::new(),
        calls: Vec::new(),
    };
    visitor.visit_program(&program);
    let safe_style_map = visitor.style_maps.len() == 1
        && visitor.style_maps.iter().all(|(symbol, map)| {
            !visitor.exported_symbols.contains(symbol)
                && scoping.get_resolved_reference_ids(*symbol).len() == map.props_reference_count
        });
    let create_calls = visitor
        .calls
        .iter()
        .filter(|call| call.entry_point == EntryPoint::Create)
        .count();
    let props_calls = visitor
        .calls
        .iter()
        .filter(|call| call.entry_point == EntryPoint::Props)
        .collect::<Vec<_>>();
    let fast_transform_safe = safe_style_map
        && create_calls == 1
        && !props_calls.is_empty()
        && props_calls.iter().all(|call| call.static_props)
        && visitor
            .calls
            .iter()
            .all(|call| matches!(call.entry_point, EntryPoint::Create | EntryPoint::Props));
    for call in &mut visitor.calls {
        call.fast_transform_safe = fast_transform_safe;
    }
    let removable_imports = visitor
        .cssx_imports
        .iter()
        .filter(|import| {
            !import.symbols.is_empty()
                && import.symbols.iter().all(|symbol| {
                    let resolved_references = scoping.get_resolved_reference_ids(*symbol);
                    let collected_references = visitor
                        .cssx_import_references
                        .iter()
                        .filter(|reference| reference.symbol == *symbol)
                        .collect::<Vec<_>>();
                    resolved_references.len() == collected_references.len()
                        && collected_references.iter().all(|reference| {
                            visitor.calls.iter().any(|call| {
                                call.start <= reference.start && reference.end <= call.end
                            })
                        })
                })
        })
        .map(|import| import.range)
        .collect();
    Ok(CssxModuleAnalysis {
        calls: visitor.calls,
        removable_imports,
    })
}

/// Populates source locations when a compact native analysis needs its JavaScript fallback form.
pub fn populate_cssx_call_locations(source: &str, calls: &mut [CssxCall]) {
    let source_offsets = SourceOffsetIndex::new(source);
    for call in calls {
        let (line, column, start_utf16) = source_offsets.source_location(source, call.start);
        call.line = line;
        call.column = column;
        call.start_utf16 = start_utf16;
        call.end_utf16 = source_offsets.utf16_offset(source, call.end as usize);
    }
}

/// Analyzes source modules in bounded, ordered batches.
///
/// Parsing each module uses a fresh Oxc arena which is dropped before the next
/// module is processed. The fixed batch bound keeps project startup from
/// creating an unbounded amount of queued per-module work.
pub fn find_cssx_calls_in_modules<'a>(
    modules: &[SourceModule<'a>],
    import_source: &str,
) -> Vec<Result<Vec<CssxCall>, String>> {
    let mut results = Vec::with_capacity(modules.len());
    for batch in lowdash::chunk(modules, 32) {
        results.extend(
            batch
                .iter()
                .map(|module| find_cssx_calls(module.source, module.filename, import_source)),
        );
    }
    results
}

struct CssxCallCollector<'a> {
    import_source: &'a str,
    source: &'a str,
    source_offsets: SourceOffsetIndex,
    include_call_positions: bool,
    track_imports: bool,
    scoping: &'a Scoping,
    named_bindings: HashMap<SymbolId, EntryPoint>,
    namespace_bindings: HashMap<SymbolId, ()>,
    style_maps: HashMap<SymbolId, StaticStyleMap>,
    exported_symbols: HashSet<SymbolId>,
    cssx_imports: Vec<CssxImport>,
    cssx_import_symbols: HashSet<SymbolId>,
    cssx_import_references: Vec<CssxImportReference>,
    calls: Vec<CssxCall>,
}

struct CssxImport {
    range: CssxImportRange,
    symbols: Vec<SymbolId>,
}

struct CssxImportReference {
    symbol: SymbolId,
    start: u32,
    end: u32,
}

struct StaticStyleMap {
    style_names: HashSet<Arc<str>>,
    props_reference_count: usize,
}

const UTF16_CHECKPOINT_STRIDE: usize = 256;

struct SourceOffsetIndex {
    lines: Vec<(usize, u32)>,
    utf16_checkpoints: Vec<(usize, u32)>,
    ascii: bool,
}

impl SourceOffsetIndex {
    fn new(source: &str) -> Self {
        let ascii = source.is_ascii();
        let mut lines = vec![(0, 0)];
        let mut utf16_checkpoints = vec![(0, 0)];
        let mut utf16_offset = 0;
        let mut next_checkpoint = UTF16_CHECKPOINT_STRIDE;
        for (byte_offset, character) in source.char_indices() {
            if !ascii && byte_offset >= next_checkpoint {
                utf16_checkpoints.push((byte_offset, utf16_offset));
                next_checkpoint = byte_offset + UTF16_CHECKPOINT_STRIDE;
            }
            utf16_offset += character.len_utf16() as u32;
            if character == '\n' {
                lines.push((byte_offset + 1, utf16_offset));
            }
        }
        utf16_checkpoints.push((source.len(), utf16_offset));
        Self {
            lines,
            utf16_checkpoints,
            ascii,
        }
    }

    fn utf16_offset(&self, source: &str, byte_offset: usize) -> u32 {
        if self.ascii {
            return byte_offset as u32;
        }
        let checkpoint = self
            .utf16_checkpoints
            .partition_point(|(offset, _)| *offset <= byte_offset)
            .saturating_sub(1);
        let (base_byte_offset, base_utf16_offset) = self.utf16_checkpoints[checkpoint];
        base_utf16_offset + source[base_byte_offset..byte_offset].encode_utf16().count() as u32
    }

    fn source_location(&self, source: &str, byte_offset: u32) -> (u32, u32, u32) {
        let byte_offset = byte_offset as usize;
        let line_index = self
            .lines
            .partition_point(|(line_start, _)| *line_start <= byte_offset)
            .saturating_sub(1);
        let utf16_line_start = self.lines[line_index].1;
        let utf16_offset = self.utf16_offset(source, byte_offset);
        (
            line_index as u32 + 1,
            utf16_offset - utf16_line_start,
            utf16_offset,
        )
    }
}

impl<'a> CssxCallCollector<'a> {
    fn imported_symbol(
        &self,
        identifier: &oxc_ast::ast::IdentifierReference<'_>,
    ) -> Option<SymbolId> {
        let reference = identifier.reference_id.get()?;
        self.scoping.get_reference(reference).symbol_id()
    }

    fn entry_point(&self, call: &CallExpression<'_>) -> Option<EntryPoint> {
        match &call.callee {
            Expression::Identifier(identifier) => self
                .imported_symbol(identifier)
                .and_then(|symbol| self.named_bindings.get(&symbol).copied()),
            Expression::StaticMemberExpression(member) => {
                let Expression::Identifier(object) = &member.object else {
                    return None;
                };
                let symbol = self.imported_symbol(object)?;
                if !self.namespace_bindings.contains_key(&symbol) {
                    return None;
                }
                EntryPoint::from_export_name(member.property.name.as_str())
            }
            _ => None,
        }
    }

    fn source_location(&self, offset: u32) -> (u32, u32, u32) {
        self.source_offsets.source_location(self.source, offset)
    }

    fn style_names(&mut self, call: &CallExpression<'_>) -> Option<Vec<Arc<str>>> {
        let mut names = Vec::new();
        for argument in &call.arguments {
            let expression = match argument {
                Argument::SpreadElement(_) => return None,
                _ => argument.as_expression()?,
            };
            match expression {
                Expression::BooleanLiteral(_) | Expression::NullLiteral(_) => {}
                Expression::StaticMemberExpression(member) => {
                    let name = member.property.name.as_str();
                    self.push_style_reference(&member.object, name, &mut names)?;
                }
                Expression::ComputedMemberExpression(member) => {
                    let Expression::StringLiteral(key) = &member.expression else {
                        return None;
                    };
                    self.push_style_reference(&member.object, key.value.as_str()?, &mut names)?;
                }
                _ => return None,
            }
        }
        Some(names)
    }

    fn push_style_reference(
        &mut self,
        object: &Expression<'_>,
        name: &str,
        names: &mut Vec<Arc<str>>,
    ) -> Option<()> {
        let Expression::Identifier(identifier) = object else {
            return None;
        };
        let symbol = self.imported_symbol(identifier)?;
        let map = self.style_maps.get_mut(&symbol)?;
        let style_name = map.style_names.get(name)?.clone();
        map.props_reference_count += 1;
        names.push(style_name);
        Some(())
    }
}

impl<'a> Visit<'a> for CssxCallCollector<'_> {
    fn visit_import_declaration(&mut self, declaration: &ImportDeclaration<'a>) {
        if declaration.import_kind != ImportOrExportKind::Type
            && declaration.source.value.as_str() == Some(self.import_source)
            && let Some(specifiers) = &declaration.specifiers
        {
            let mut symbols = Vec::new();
            for specifier in specifiers {
                match specifier {
                    ImportDeclarationSpecifier::ImportSpecifier(specifier)
                        if specifier.import_kind != ImportOrExportKind::Type =>
                    {
                        if let Some(symbol) = specifier.local.symbol_id.get()
                            && self.track_imports
                        {
                            symbols.push(symbol);
                            self.cssx_import_symbols.insert(symbol);
                        }
                        let export_name = match &specifier.imported {
                            ModuleExportName::IdentifierName(identifier) => {
                                Some(identifier.name.as_str())
                            }
                            ModuleExportName::StringLiteral(literal) => literal.value.as_str(),
                            ModuleExportName::IdentifierReference(_) => None,
                        };
                        if let (Some(entry_point), Some(symbol)) = (
                            export_name.and_then(EntryPoint::from_export_name),
                            specifier.local.symbol_id.get(),
                        ) {
                            self.named_bindings.insert(symbol, entry_point);
                        }
                    }
                    ImportDeclarationSpecifier::ImportNamespaceSpecifier(specifier) => {
                        if let Some(symbol) = specifier.local.symbol_id.get() {
                            self.namespace_bindings.insert(symbol, ());
                            if self.track_imports {
                                symbols.push(symbol);
                                self.cssx_import_symbols.insert(symbol);
                            }
                        }
                    }
                    ImportDeclarationSpecifier::ImportDefaultSpecifier(specifier) => {
                        if let Some(symbol) = specifier.local.symbol_id.get()
                            && self.track_imports
                        {
                            symbols.push(symbol);
                            self.cssx_import_symbols.insert(symbol);
                        }
                    }
                    ImportDeclarationSpecifier::ImportSpecifier(_) => {}
                }
            }
            if !symbols.is_empty() {
                self.cssx_imports.push(CssxImport {
                    range: CssxImportRange {
                        start: declaration.span.start,
                        end: declaration.span.end,
                        start_utf16: self
                            .source_offsets
                            .utf16_offset(self.source, declaration.span.start as usize),
                        end_utf16: self
                            .source_offsets
                            .utf16_offset(self.source, declaration.span.end as usize),
                    },
                    symbols,
                });
            }
        }
        walk::walk_import_declaration(self, declaration);
    }

    fn visit_identifier_reference(&mut self, identifier: &IdentifierReference<'a>) {
        if self.track_imports
            && let Some(symbol) = self.imported_symbol(identifier)
            && self.cssx_import_symbols.contains(&symbol)
        {
            self.cssx_import_references.push(CssxImportReference {
                symbol,
                start: identifier.span.start,
                end: identifier.span.end,
            });
        }
        walk::walk_identifier_reference(self, identifier);
    }

    fn visit_export_declaration(&mut self, declaration: &ExportDeclaration<'a>) {
        if let Declaration::VariableDeclaration(variable) = &declaration.declaration {
            for declarator in &variable.declarations {
                if let Some(symbol) = declarator
                    .id
                    .get_binding_identifier()
                    .and_then(|binding| binding.symbol_id.get())
                {
                    self.exported_symbols.insert(symbol);
                }
            }
        }
        walk::walk_export_declaration(self, declaration);
    }

    fn visit_variable_declarator(&mut self, declarator: &VariableDeclarator<'a>) {
        if let (Some(binding), Some(Expression::CallExpression(call))) = (
            declarator.id.get_binding_identifier(),
            declarator.init.as_ref(),
        ) && self.entry_point(call) == Some(EntryPoint::Create)
            && call.arguments.len() == 1
            && let Some(argument) = call.arguments.first()
            && let Some(expression) = argument.as_expression()
            && let Some(styles) = collect_static_style_map(expression)
            && let Some(symbol) = binding.symbol_id.get()
            && self.scoping.symbol_scope_id(symbol) == self.scoping.root_scope_id()
        {
            let style_names = styles
                .iter()
                .map(|style| Arc::<str>::from(style.name.as_str()))
                .collect();
            self.style_maps.insert(
                symbol,
                StaticStyleMap {
                    style_names,
                    props_reference_count: 0,
                },
            );
        }
        walk::walk_variable_declarator(self, declarator);
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        if let Some(entry_point) = self.entry_point(call) {
            let mut utilities = Vec::new();
            let static_sx = entry_point == EntryPoint::Sx
                && call.arguments.iter().all(|argument| match argument {
                    Argument::SpreadElement(_) => false,
                    _ => argument.as_expression().is_some_and(is_static_sx),
                });
            if entry_point == EntryPoint::Sx
                && !call.arguments.iter().all(|argument| match argument {
                    Argument::SpreadElement(_) => false,
                    _ => argument
                        .as_expression()
                        .is_some_and(|expression| collect_sx_utilities(expression, &mut utilities)),
                })
            {
                utilities.clear();
            }
            let styles = if entry_point == EntryPoint::Create && call.arguments.len() == 1 {
                call.arguments
                    .first()
                    .and_then(Argument::as_expression)
                    .and_then(collect_static_style_map)
                    .unwrap_or_default()
            } else {
                Vec::new()
            };
            let static_create = entry_point == EntryPoint::Create
                && call.arguments.len() == 1
                && !styles.is_empty();
            let (static_props, style_names) = if entry_point == EntryPoint::Props {
                match self.style_names(call) {
                    Some(names) => (true, names),
                    None => (false, Vec::new()),
                }
            } else {
                (false, Vec::new())
            };
            let include_start_location =
                self.include_call_positions || entry_point == EntryPoint::Create;
            let (line, column, start_utf16) = if include_start_location {
                self.source_location(call.span.start)
            } else {
                (0, 0, 0)
            };
            let end_utf16 = if self.include_call_positions {
                self.source_location(call.span.end).2
            } else {
                0
            };
            self.calls.push(CssxCall {
                entry_point,
                start: call.span.start,
                end: call.span.end,
                start_utf16,
                end_utf16,
                line,
                column,
                static_sx,
                static_create,
                static_props,
                fast_transform_safe: false,
                utilities,
                styles,
                style_names,
            });
        }
        walk::walk_call_expression(self, call);
    }
}

fn collect_static_style_map(expression: &Expression<'_>) -> Option<Vec<CssxStyleEntry>> {
    let Expression::ObjectExpression(object) = expression else {
        return None;
    };
    if object.properties.is_empty() {
        return None;
    }
    let mut styles: Vec<CssxStyleEntry> = Vec::with_capacity(object.properties.len());
    for property in &object.properties {
        let ObjectPropertyKind::ObjectProperty(property) = property else {
            return None;
        };
        if property.kind != PropertyKind::Init || property.method || property.computed {
            return None;
        }
        let name = match &property.key {
            PropertyKey::StaticIdentifier(identifier) => identifier.name.to_string(),
            PropertyKey::StringLiteral(literal) => literal.value.as_str()?.to_owned(),
            _ => return None,
        };
        let Expression::StringLiteral(value) = &property.value else {
            return None;
        };
        let utilities = value.value.as_str()?.to_owned();
        if let Some(existing) = styles.iter_mut().find(|style| style.name == name) {
            existing.utilities = utilities;
        } else {
            styles.push(CssxStyleEntry { name, utilities });
        }
    }
    Some(styles)
}

fn is_static_sx(expression: &Expression<'_>) -> bool {
    match expression {
        Expression::StringLiteral(_)
        | Expression::NullLiteral(_)
        | Expression::BooleanLiteral(_) => true,
        Expression::ArrayExpression(array) => array.elements.iter().all(|element| match element {
            oxc_ast::ast::ArrayExpressionElement::SpreadElement(_)
            | oxc_ast::ast::ArrayExpressionElement::Elision(_) => false,
            _ => is_static_sx(element.to_expression()),
        }),
        _ => false,
    }
}

fn collect_sx_utilities(expression: &Expression<'_>, utilities: &mut Vec<String>) -> bool {
    match expression {
        Expression::StringLiteral(literal) => {
            if let Some(value) = literal.value.as_str() {
                utilities.push(value.to_owned());
                true
            } else {
                false
            }
        }
        Expression::NullLiteral(_) | Expression::BooleanLiteral(_) => true,
        Expression::ArrayExpression(array) => array.elements.iter().all(|element| match element {
            oxc_ast::ast::ArrayExpressionElement::SpreadElement(_) => false,
            oxc_ast::ast::ArrayExpressionElement::Elision(_) => false,
            _ => collect_sx_utilities(element.to_expression(), utilities),
        }),
        Expression::LogicalExpression(logical)
            if logical.operator == oxc_syntax::operator::LogicalOperator::And =>
        {
            collect_sx_utilities(&logical.right, utilities)
        }
        Expression::ConditionalExpression(conditional) => {
            collect_sx_utilities(&conditional.consequent, utilities)
                && collect_sx_utilities(&conditional.alternate, utilities)
        }
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        CssxStyleEntry, EntryPoint, SourceModule, analyze_cssx_module, find_cssx_calls,
        find_cssx_calls_in_modules, find_cssx_calls_without_positions,
        populate_cssx_call_locations,
    };

    #[test]
    fn resolves_named_aliases_and_namespace_imports() {
        let calls = find_cssx_calls(
            "import { sx as style, create } from '@cssxio/cssx'; import * as cssx from '@cssxio/cssx'; style('p-4'); create({}); cssx.sx('m-2')",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert_eq!(
            calls
                .iter()
                .map(|call| call.entry_point)
                .collect::<Vec<_>>(),
            [EntryPoint::Sx, EntryPoint::Create, EntryPoint::Sx]
        );
        assert_eq!(calls[0].utilities, ["p-4"]);
        assert_eq!(calls[2].utilities, ["m-2"]);
    }

    #[test]
    fn ignores_shadowed_names_and_unrelated_imports() {
        let calls = find_cssx_calls(
            "import { sx } from '@cssxio/cssx'; import { create } from 'other'; function local(sx) { sx('p-4'); } create({}); sx('m-2')",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].utilities, ["m-2"]);
    }

    #[test]
    fn collects_supported_nested_static_forms_and_reports_utf8_byte_spans() {
        let source = "import { sx } from '@cssxio/cssx'; sx(['p-4', flag && 'm-2', flag ? 'text-sm' : 'text-lg'])";
        let calls = find_cssx_calls(source, "page.tsx", "@cssxio/cssx").unwrap();
        assert_eq!(calls[0].utilities, ["p-4", "m-2", "text-sm", "text-lg"]);
        assert_eq!(
            &source[calls[0].start as usize..calls[0].end as usize],
            "sx(['p-4', flag && 'm-2', flag ? 'text-sm' : 'text-lg'])"
        );
        assert!(!calls[0].static_sx);
    }

    #[test]
    fn reports_utf16_offsets_and_static_sx_forms() {
        let source =
            "import { sx } from '@cssxio/cssx';\nconst emoji = '🙂';\n  sx(['p-4', false, null])";
        let calls = find_cssx_calls(source, "page.tsx", "@cssxio/cssx").unwrap();
        let call = &calls[0];
        assert!(call.static_sx);
        assert_eq!(call.line, 3);
        assert_eq!(call.column, 2);
        assert_eq!(
            call.start_utf16 as usize,
            source[..call.start as usize].encode_utf16().count()
        );
        assert_eq!(
            call.end_utf16 as usize,
            source[..call.end as usize].encode_utf16().count()
        );
        assert_eq!(call.utilities, ["p-4"]);
    }

    #[test]
    fn compact_analysis_can_restore_source_locations_on_fallback() {
        let source = "import { sx } from '@cssxio/cssx';\nconst emoji = '🙂';\n  sx('p-4')";
        let expected = find_cssx_calls(source, "page.tsx", "@cssxio/cssx").unwrap();
        let mut compact =
            find_cssx_calls_without_positions(source, "page.tsx", "@cssxio/cssx").unwrap();
        assert_eq!(compact[0].line, 0);
        assert_eq!(compact[0].start_utf16, 0);

        populate_cssx_call_locations(source, &mut compact);

        assert_eq!(compact, expected);
    }

    #[test]
    fn keeps_utf16_offsets_fast_for_many_calls_in_a_long_unicode_line() {
        let mut source = String::from("import { sx } from '@cssxio/cssx'; const filler = '");
        source.push_str(&"🙂".repeat(8_192));
        source.push_str("';");
        for _ in 0..256 {
            source.push_str(" sx('p-4');");
        }

        let calls = find_cssx_calls(&source, "page.tsx", "@cssxio/cssx").unwrap();
        assert_eq!(calls.len(), 256);
        for call in calls {
            assert_eq!(call.line, 1);
            assert_eq!(call.column, call.start_utf16);
            assert_eq!(
                call.start_utf16 as usize,
                source[..call.start as usize].encode_utf16().count()
            );
            assert_eq!(
                call.end_utf16 as usize,
                source[..call.end as usize].encode_utf16().count()
            );
        }
    }

    #[test]
    fn extracts_static_create_maps_and_props_references() {
        let calls = find_cssx_calls(
            "import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-4', accent: 'bg-red-500' }); export const value = cssx.props(styles.root);",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert!(calls[0].static_create);
        assert!(
            calls
                .windows(2)
                .all(|pair| (pair[0].start, pair[0].end) <= (pair[1].start, pair[1].end))
        );
        assert_eq!(
            calls[0].styles,
            [
                CssxStyleEntry {
                    name: "root".to_owned(),
                    utilities: "p-4".to_owned(),
                },
                CssxStyleEntry {
                    name: "accent".to_owned(),
                    utilities: "bg-red-500".to_owned(),
                },
            ]
        );
        assert!(calls[1].static_props);
        assert_eq!(calls[1].style_names[0].as_ref(), "root");
        assert!(calls.iter().all(|call| call.fast_transform_safe));
    }

    #[test]
    fn only_marks_cssx_imports_removable_when_all_bindings_are_replaced() {
        let source = "import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-4' }); export const value = cssx.props(styles.root);";
        let analysis = analyze_cssx_module(source, "page.tsx", "@cssxio/cssx", false).unwrap();
        assert_eq!(analysis.removable_imports.len(), 1);
        assert_eq!(
            &source[analysis.removable_imports[0].start as usize
                ..analysis.removable_imports[0].end as usize],
            "import * as cssx from '@cssxio/cssx';"
        );

        let source_with_other_use = "import * as cssx from '@cssxio/cssx'; const styles = cssx.create({ root: 'p-4' }); export const value = cssx.props(styles.root); export const runtime = cssx;";
        let analysis =
            analyze_cssx_module(source_with_other_use, "page.tsx", "@cssxio/cssx", false).unwrap();
        assert!(analysis.removable_imports.is_empty());
    }

    #[test]
    fn rejects_static_create_maps_with_dynamic_props_or_other_map_references() {
        let dynamic_props = find_cssx_calls(
            "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); props(styles[variant]);",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert!(dynamic_props[0].static_create);
        assert!(!dynamic_props[1].static_props);
        assert!(!dynamic_props.iter().any(|call| call.fast_transform_safe));

        let other_reference = find_cssx_calls(
            "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); const copy = styles.root; props(styles.root);",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert!(other_reference[1].static_props);
        assert!(!other_reference.iter().any(|call| call.fast_transform_safe));

        let exported_map = find_cssx_calls(
            "import { create, props } from '@cssxio/cssx'; export const styles = create({ root: 'p-4', accent: 'bg-red-500' }); export const value = props(styles.root);",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert!(!exported_map.iter().any(|call| call.fast_transform_safe));
    }

    #[test]
    fn ignores_nonliteral_style_maps_and_missing_style_names() {
        let calls = find_cssx_calls(
            "import { create, props } from '@cssxio/cssx'; const styles = create({ root: classes }); props(styles.missing);",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert!(!calls[0].static_create);
        assert!(!calls[1].static_props);
        assert!(calls.iter().all(|call| !call.fast_transform_safe));
    }

    #[test]
    fn does_not_panic_on_spread_arguments_or_style_properties() {
        let calls = find_cssx_calls(
            "import { create, props, sx } from '@cssxio/cssx'; const styles = create(...styleArgs); props(styles.root); sx(...utilities); create({ ...base, root: 'p-4' });",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();

        assert!(!calls[0].static_create);
        assert!(!calls[1].static_props);
        assert!(!calls[2].static_sx);
        assert!(!calls[3].static_create);
    }

    #[test]
    fn accepts_custom_import_sources() {
        let calls = find_cssx_calls(
            "import { sx } from 'design-system/cssx'; sx('p-4')",
            "page.tsx",
            "design-system/cssx",
        )
        .unwrap();
        assert_eq!(calls.len(), 1);
    }

    #[test]
    fn ignores_static_strings_when_the_call_cannot_be_folded() {
        let calls = find_cssx_calls(
            "import { sx } from '@cssxio/cssx'; sx(['p-4', ...items])",
            "page.tsx",
            "@cssxio/cssx",
        )
        .unwrap();
        assert!(calls[0].utilities.is_empty());
    }

    #[test]
    fn returns_parse_errors_and_rejects_unknown_extensions() {
        assert!(find_cssx_calls("import {", "page.tsx", "@cssxio/cssx").is_err());
        assert!(find_cssx_calls("const page = 1", "page.unknown", "@cssxio/cssx").is_err());
    }

    #[test]
    fn analyzes_bounded_batches_in_source_order() {
        let sources = [
            SourceModule {
                filename: "first.tsx",
                source: "import { sx } from '@cssxio/cssx'; sx('p-4')",
            },
            SourceModule {
                filename: "second.tsx",
                source: "import { sx } from '@cssxio/cssx'; sx('m-2')",
            },
            SourceModule {
                filename: "third.tsx",
                source: "import { sx } from '@cssxio/cssx'; sx('text-sm')",
            },
        ];
        let results = find_cssx_calls_in_modules(&sources, "@cssxio/cssx");
        assert_eq!(results.len(), sources.len());
        assert_eq!(results[0].as_ref().unwrap()[0].utilities, ["p-4"]);
        assert_eq!(results[1].as_ref().unwrap()[0].utilities, ["m-2"]);
        assert_eq!(results[2].as_ref().unwrap()[0].utilities, ["text-sm"]);
    }
}
