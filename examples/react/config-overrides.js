/* eslint-disable @typescript-eslint/no-require-imports */
const cssx = require('@cssxio/unplugin/webpack').default;

const theme = `
@theme reference {
  --color-brand: #087ea4;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

module.exports = {
  webpack(config) {
    config.plugins.push(cssx({ cssFileName: 'cssx.css', theme }));
    return config;
  },
};
