import cssx from '@cssxio/unplugin/vite';
import { defineConfig } from 'astro/config';

const theme = `
@theme reference {
  --color-brand: #3245ff;
  --font-display: ui-rounded, sans-serif;
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
