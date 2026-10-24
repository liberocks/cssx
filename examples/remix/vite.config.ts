import cssx from '@cssxio/unplugin/vite';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const theme = `
@theme reference {
  --color-brand: #ea580c;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

export default defineConfig({
  plugins: [cssx({ cssFileName: 'cssx.css', theme }), reactRouter()],
});
