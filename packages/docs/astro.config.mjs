import { defineConfig } from 'astro/config';
import cssx from '@cssxio/unplugin/vite';

export default defineConfig({
  output: 'static',
  vite: {
    plugins: [cssx({ cssFileName: 'assets/cssx.css' })],
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
