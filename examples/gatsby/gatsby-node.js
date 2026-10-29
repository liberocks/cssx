/* eslint-disable @typescript-eslint/no-require-imports */
const cssx = require('@cssxio/unplugin/webpack').default;

const theme = `
@theme reference {
  --color-brand: #663399;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;
const stableClassNames = true;

exports.onCreateBabelConfig = ({ actions, stage }) => {
  if (!stage.endsWith('-html')) return;
  actions.setBabelPlugin({ name: '@cssxio/babel-plugin', options: { theme, stableClassNames }, stage });
};

exports.onCreateWebpackConfig = ({ actions, stage }) => {
  if (stage.endsWith('-html')) return;
  actions.setWebpackConfig({
    plugins: [cssx({ cssFileName: 'cssx.css', theme, stableClassNames })],
  });
};
