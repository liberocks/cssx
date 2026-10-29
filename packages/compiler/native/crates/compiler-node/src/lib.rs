//! Node.js binding for the shared Rust CSSX compiler.

use cssx_compiler_core::{
    CssxCall, SourceModule, find_cssx_calls as analyze_cssx_calls,
    find_cssx_calls_in_modules as analyze_cssx_modules,
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
    /// Static utility strings found by the `sx()` grammar.
    pub utilities: Vec<String>,
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
            utilities: call.utilities,
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
