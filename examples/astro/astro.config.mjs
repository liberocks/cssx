import { defineConfig } from 'astro/config';
import cssx from '@cssxio/unplugin/vite';

const theme = `
@theme reference {
  --color-brand: #3245ff;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

export default defineConfig({
  vite: {
    plugins: [cssx({ cssFileName: 'assets/cssx.css', theme })],
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('/zod/')) {
            return;
          }
          warn(warning);
        },
      },
    },
  },
});
