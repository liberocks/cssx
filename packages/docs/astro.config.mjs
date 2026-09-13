import cssx from '@cssxio/unplugin/vite';
import { defineConfig } from 'astro/config';

const theme = `
@theme reference {
  --color-brand: #3245ff;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
  --animate-marquee: marquee 40s linear infinite;
  @keyframes marquee {
    to { translate: -50% 0; }
  }
}
`;

export default defineConfig({
  vite: {
    plugins: [
      cssx({
        cssFileName: 'assets/cssx.css',
        theme,
        darkMode: 'selector',
      }),
    ],
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
