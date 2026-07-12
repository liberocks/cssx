import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import cssx from '@cssxio/unplugin/vite';

const theme = `
@theme reference {
  --color-brand: #2c4f7c;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

export default defineConfig({
  plugins: [cssx({ cssFileName: 'cssx.css', theme }), solid()],
});
