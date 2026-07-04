/* eslint-disable @typescript-eslint/no-require-imports */
const cssx = require('@cssxio/unplugin/webpack').default;

const theme = `
@theme reference {
  --color-brand: #663399;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

exports.onCreateBabelConfig = ({ actions, stage }) => {
  if (!stage.endsWith('-html')) return;
  actions.setBabelPlugin({ name: '@cssxio/babel-plugin', options: { theme }, stage });
};

exports.onCreateWebpackConfig = ({ actions, stage }) => {
  if (stage.endsWith('-html')) return;
  actions.setWebpackConfig({
    plugins: [cssx({ cssFileName: 'cssx.css', theme })],
  });
};
