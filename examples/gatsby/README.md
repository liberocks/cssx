# CSSX + Gatsby

Gatsby exposes webpack configuration through `onCreateWebpackConfig`. This
example adds the CSSX webpack adapter there and its Babel transform through
`onCreateBabelConfig` for server-side rendering. Gatsby writes the generated
`cssx.css` asset to `public`, and the page `Head` export loads it from
`/cssx.css`.

The Babel transform and Webpack extraction run in separate Gatsby build stages,
so production enables `stableClassNames` in both to keep server-rendered selectors
aligned with the extracted stylesheet.
