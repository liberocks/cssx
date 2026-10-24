# CSSX Utility Assistant

A small editor extension for static CSSX utility strings. It shows completion
and hover help in `cssx.create`, `sx`, and common `class` and `className`
attributes in supported source files.

Completions are generated from the checked-in compiler utility corpus and
default theme. The installed extension includes the generated catalog, so it
does not need the compiler package, a language server, or network access.

Completions cover the compiler's spacing and scroll-spacing axes, inset and
sizing utilities, grid and flex alignment, sibling spacing, text flow and line
clamping, SVG, visual effects, animation, and responsive or state variants.

To develop it locally, open this folder in VS Code and press `F5` to launch an
Extension Development Host.

The extension suggests utilities automatically inside multiline
`cssx.create(...)` values, `sx(...)` strings, and `class` or `className`
attributes. Palette colors include completion swatches, source decorations,
and color-picker support. Disable source swatches with
`cssxIntelliSense.colorDecorators`.

Regenerate and check the catalog from the repository root with
`pnpm generate:intellisense-catalog` and
`node scripts/generate-intellisense-catalog.mjs --check`.
