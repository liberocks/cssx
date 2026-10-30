//! Node.js binding for the shared Rust CSSX compiler.

use std::collections::{HashMap, HashSet};

use cssx_compiler_core::{
    CssxCall, CssxImportRange, CssxStyleEntry, SourceModule,
    analyze_cssx_module as analyze_cssx_module_core, find_cssx_calls as analyze_cssx_calls,
    find_cssx_calls_in_modules as analyze_cssx_modules, populate_cssx_call_locations,
};
use napi::{Error, Result};
use napi_derive::napi;

/// JavaScript representation of one CSSX call discovered in a source module.
#[napi(object)]
pub struct JsCssxCall {
    /// CSSX entry point name.
    pub entry_point: String,
    /// UTF-8 byte offset where the call starts.
    pub start: u32,
    /// UTF-8 byte offset where the call ends.
    pub end: u32,
    /// UTF-16 code-unit offset where the call starts.
    pub start_utf16: u32,
    /// UTF-16 code-unit offset where the call ends.
    pub end_utf16: u32,
    /// One-based source line at the start of the call.
    pub line: u32,
    /// Zero-based UTF-16 column at the start of the call.
    pub column: u32,
    /// Whether every argument can be folded without runtime expressions.
    pub static_sx: bool,
    /// Whether `create()` contains a static object of string utility values.
    pub static_create: bool,
    /// Whether every `props()` argument resolves to a known static style key.
    pub static_props: bool,
    /// Whether the module has one static map whose references are all static `props()` calls.
    pub fast_transform_safe: bool,
    /// Static utility strings found by the `sx()` grammar.
    pub utilities: Vec<String>,
    /// Literal style map entries returned for a static `create()` call.
    pub styles: Vec<JsCssxStyleEntry>,
    /// Style keys referenced by a static `props()` call.
    pub style_names: Vec<String>,
}

/// Literal style entry returned by the analyzer.
#[napi(object)]
pub struct JsCssxStyleEntry {
    /// Style key in the source object.
    pub name: String,
    /// Utility string assigned to the style key.
    pub utilities: String,
}

/// CSSX call metadata retained natively until the JavaScript transform needs its fallback form.
#[napi]
pub struct JsCssxModuleAnalysis {
    source: String,
    calls: Vec<CssxCall>,
    create_call: Option<CssxCall>,
    styles: Vec<CssxStyleEntry>,
    used_style_names: Vec<String>,
    removable_imports: Vec<CssxImportRange>,
    fast_static_create: bool,
}

/// One style name and its already serialized JavaScript replacement.
#[napi(object)]
pub struct JsStaticCreateReplacement {
    /// Style key in the `create()` map.
    pub name: String,
    /// Complete JavaScript object literal used to replace its `props()` call.
    pub replacement: String,
}

/// One JavaScript source range.
#[napi(object)]
pub struct JsCssxSourceRange {
    /// UTF-16 code-unit offset of the range start.
    pub start: u32,
    /// UTF-16 code-unit offset of the range end.
    pub end: u32,
}

#[napi]
impl JsCssxModuleAnalysis {
    /// Whether this module contains one safe static `create()` map and only static `props()` calls.
    #[napi(getter, js_name = "fastStaticCreate")]
    pub fn fast_static_create(&self) -> bool {
        self.fast_static_create
    }

    /// Static style entries extracted from the source map.
    #[napi(getter)]
    pub fn styles(&self) -> Vec<JsCssxStyleEntry> {
        self.styles
            .iter()
            .cloned()
            .map(JsCssxStyleEntry::from)
            .collect()
    }

    /// Unique style names referenced by static `props()` calls.
    #[napi(getter, js_name = "usedStyleNames")]
    pub fn used_style_names(&self) -> Vec<String> {
        self.used_style_names.clone()
    }

    /// One-based source line containing the `create()` call.
    #[napi(getter, js_name = "createLine")]
    pub fn create_line(&self) -> u32 {
        self.create_call
            .as_ref()
            .map(|call| call.line)
            .unwrap_or_default()
    }

    /// Zero-based UTF-16 column containing the `create()` call.
    #[napi(getter, js_name = "createColumn")]
    pub fn create_column(&self) -> u32 {
        self.create_call
            .as_ref()
            .map(|call| call.column)
            .unwrap_or_default()
    }

    /// CSSX import declarations that can be removed after static calls are rewritten.
    #[napi(getter, js_name = "removableImports")]
    pub fn removable_imports(&self) -> Vec<JsCssxSourceRange> {
        self.removable_imports
            .iter()
            .map(|range| JsCssxSourceRange {
                start: range.start_utf16,
                end: range.end_utf16,
            })
            .collect()
    }

    /// Converts all CSSX calls to replacement JavaScript without crossing the N-API boundary per call.
    #[napi(js_name = "replaceCalls")]
    pub fn replace_calls(&self, replacements: Vec<JsStaticCreateReplacement>) -> Result<String> {
        if !self.fast_static_create {
            return Err(Error::from_reason(
                "CSSX native static create analysis is not safe for direct replacement.",
            ));
        }
        if self.create_call.is_none() {
            return Err(Error::from_reason(
                "CSSX native static create analysis has no create call.",
            ));
        }
        let replacement_by_name = replacements
            .into_iter()
            .map(|replacement| (replacement.name, replacement.replacement))
            .collect::<HashMap<_, _>>();
        let mut edits = Vec::with_capacity(self.calls.len() + self.removable_imports.len());
        for call in &self.calls {
            let replacement = match call.entry_point {
                cssx_compiler_core::EntryPoint::Create => "{}",
                cssx_compiler_core::EntryPoint::Props => match call.style_names.first() {
                    Some(style_name) => replacement_by_name
                        .get(style_name.as_ref())
                        .map(String::as_str)
                        .ok_or_else(|| {
                            Error::from_reason(format!(
                                "CSSX native static create analysis has no replacement for style \"{style_name}\"."
                            ))
                        })?,
                    None => r#"{"className":""}"#,
                },
                _ => {
                    return Err(Error::from_reason(
                        "CSSX native static create analysis found an unsupported call.",
                    ));
                }
            };
            edits.push((
                call.start as usize,
                call.end as usize,
                replacement.to_owned(),
            ));
        }
        edits.extend(
            self.removable_imports
                .iter()
                .map(|import| (import.start as usize, import.end as usize, String::new())),
        );
        edits.sort_by_key(|(start, _, _)| *start);
        let mut output = String::with_capacity(self.source.len());
        let mut cursor = 0usize;
        for (start, end, replacement) in edits {
            if start < cursor || end > self.source.len() {
                return Err(Error::from_reason(
                    "CSSX native static create analysis found overlapping or invalid source ranges.",
                ));
            }
            output.push_str(&self.source[cursor..start]);
            output.push_str(&replacement);
            cursor = end;
        }
        output.push_str(&self.source[cursor..]);
        Ok(output)
    }

    /// Returns complete call records only when the fast static transform cannot handle the styles.
    #[napi(js_name = "getCalls")]
    pub fn get_calls(&self) -> Result<Vec<JsCssxCall>> {
        let mut calls = self.calls.clone();
        populate_cssx_call_locations(&self.source, &mut calls);
        Ok(calls.into_iter().map(JsCssxCall::from).collect())
    }
}

impl From<CssxStyleEntry> for JsCssxStyleEntry {
    fn from(style: CssxStyleEntry) -> Self {
        Self {
            name: style.name,
            utilities: style.utilities,
        }
    }
}

/// Source module passed to the bounded project analyzer.
#[napi(object)]
pub struct JsSourceModule {
    /// Module path with a JS/TS/JSX/TSX extension.
    pub filename: String,
    /// JavaScript or TypeScript source text.
    pub source: String,
}

impl From<CssxCall> for JsCssxCall {
    fn from(call: CssxCall) -> Self {
        let entry_point = match call.entry_point {
            cssx_compiler_core::EntryPoint::Sx => "sx",
            cssx_compiler_core::EntryPoint::Create => "create",
            cssx_compiler_core::EntryPoint::Props => "props",
        };
        Self {
            entry_point: entry_point.to_owned(),
            start: call.start,
            end: call.end,
            start_utf16: call.start_utf16,
            end_utf16: call.end_utf16,
            line: call.line,
            column: call.column,
            static_sx: call.static_sx,
            static_create: call.static_create,
            static_props: call.static_props,
            fast_transform_safe: call.fast_transform_safe,
            utilities: call.utilities,
            styles: call
                .styles
                .into_iter()
                .map(JsCssxStyleEntry::from)
                .collect(),
            style_names: call
                .style_names
                .into_iter()
                .map(|name| name.to_string())
                .collect(),
        }
    }
}

/// Finds CSSX calls with Oxc and resolves imported bindings by symbol identity.
#[napi(js_name = "findCssxCalls")]
pub fn find_cssx_calls(
    source: String,
    filename: String,
    import_source: Option<String>,
) -> Result<Vec<JsCssxCall>> {
    analyze_cssx_calls(
        &source,
        &filename,
        import_source.as_deref().unwrap_or("@cssxio/cssx"),
    )
    .map(|calls| calls.into_iter().map(JsCssxCall::from).collect())
    .map_err(Error::from_reason)
}

/// Analyzes CSSX calls while keeping potentially large per-call metadata in Rust.
#[napi(js_name = "analyzeCssxModule")]
pub fn analyze_cssx_module(
    source: String,
    filename: String,
    import_source: Option<String>,
) -> Result<JsCssxModuleAnalysis> {
    let analysis = analyze_cssx_module_core(
        &source,
        &filename,
        import_source.as_deref().unwrap_or("@cssxio/cssx"),
        false,
    )
    .map_err(Error::from_reason)?;
    let calls = analysis.calls;
    let mut create_calls = calls
        .iter()
        .filter(|call| call.entry_point == cssx_compiler_core::EntryPoint::Create);
    let create_call = create_calls.next().cloned();
    let unique_create_call = create_calls.next().is_none();
    let props_calls = calls
        .iter()
        .filter(|call| call.entry_point == cssx_compiler_core::EntryPoint::Props)
        .collect::<Vec<_>>();
    let fast_static_create = !calls.is_empty()
        && calls.iter().all(|call| call.fast_transform_safe)
        && unique_create_call
        && create_call
            .as_ref()
            .is_some_and(|call| call.static_create && !call.styles.is_empty())
        && !props_calls.is_empty()
        && props_calls.iter().all(|call| call.style_names.len() <= 1);

    let mut used_style_names = Vec::new();
    let mut unique_style_names = HashSet::new();
    if fast_static_create {
        for name in props_calls.iter().flat_map(|call| call.style_names.iter()) {
            if unique_style_names.insert(name.clone()) {
                used_style_names.push(name.to_string());
            }
        }
    }

    let styles = if fast_static_create {
        create_call
            .as_ref()
            .map(|call| call.styles.clone())
            .unwrap_or_default()
    } else {
        Vec::new()
    };
    Ok(JsCssxModuleAnalysis {
        source,
        calls,
        create_call: fast_static_create.then_some(create_call).flatten(),
        styles,
        used_style_names,
        removable_imports: analysis.removable_imports,
        fast_static_create,
    })
}

/// Analyzes several modules in bounded batches while preserving input order.
#[napi(js_name = "findCssxCallsInModules")]
pub fn find_cssx_calls_in_modules(
    modules: Vec<JsSourceModule>,
    import_source: Option<String>,
) -> Result<Vec<Vec<JsCssxCall>>> {
    let sources = modules
        .iter()
        .map(|module| SourceModule {
            source: &module.source,
            filename: &module.filename,
        })
        .collect::<Vec<_>>();
    analyze_cssx_modules(&sources, import_source.as_deref().unwrap_or("@cssxio/cssx"))
        .into_iter()
        .map(|result| {
            result
                .map(|calls| calls.into_iter().map(JsCssxCall::from).collect())
                .map_err(Error::from_reason)
        })
        .collect()
}

/// Reports which execution backend loaded this binding.
#[napi(js_name = "backend")]
pub fn backend() -> String {
    "native".to_owned()
}
