//! Shared Rust implementation for CSSX source analysis and style compilation.

use std::{collections::HashMap, path::Path};

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, CallExpression, Expression, ImportDeclaration, ImportDeclarationSpecifier,
    ImportOrExportKind, ModuleExportName,
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
    /// Static utility strings accepted by the `sx()` argument grammar.
    pub utilities: Vec<String>,
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
    let mut visitor = CssxCallCollector {
        import_source,
        scoping: &scoping,
        named_bindings: HashMap::new(),
        namespace_bindings: HashMap::new(),
        calls: Vec::new(),
    };
    visitor.visit_program(&program);
    visitor
        .calls
        .sort_unstable_by_key(|call| (call.start, call.end));
    Ok(visitor.calls)
}

struct CssxCallCollector<'a> {
    import_source: &'a str,
    scoping: &'a Scoping,
    named_bindings: HashMap<SymbolId, EntryPoint>,
    namespace_bindings: HashMap<SymbolId, ()>,
    calls: Vec<CssxCall>,
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
}

impl<'a> Visit<'a> for CssxCallCollector<'_> {
    fn visit_import_declaration(&mut self, declaration: &ImportDeclaration<'a>) {
        if declaration.import_kind != ImportOrExportKind::Type
            && declaration.source.value.as_str() == Some(self.import_source)
            && let Some(specifiers) = &declaration.specifiers
        {
            for specifier in specifiers {
                match specifier {
                    ImportDeclarationSpecifier::ImportSpecifier(specifier)
                        if specifier.import_kind != ImportOrExportKind::Type =>
                    {
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
                        }
                    }
                    ImportDeclarationSpecifier::ImportDefaultSpecifier(_) => {}
                    ImportDeclarationSpecifier::ImportSpecifier(_) => {}
                }
            }
        }
        walk::walk_import_declaration(self, declaration);
    }

    fn visit_call_expression(&mut self, call: &CallExpression<'a>) {
        if let Some(entry_point) = self.entry_point(call) {
            let mut utilities = Vec::new();
            if entry_point == EntryPoint::Sx
                && !call.arguments.iter().all(|argument| match argument {
                    Argument::SpreadElement(_) => false,
                    _ => collect_sx_utilities(argument.to_expression(), &mut utilities),
                })
            {
                utilities.clear();
            }
            self.calls.push(CssxCall {
                entry_point,
                start: call.span.start,
                end: call.span.end,
                utilities,
            });
        }
        walk::walk_call_expression(self, call);
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
    use super::{EntryPoint, find_cssx_calls};

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
}
