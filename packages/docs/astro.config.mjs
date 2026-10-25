import cssx from '@cssxio/unplugin/vite';
import { defineConfig } from 'astro/config';

// Put project-level overrides here only when they are reused across the docs UI; prefer built-in CSSX values for one-off styles.
const theme = `
@theme reference {
  --color-brand: #3245ff;
  --font-sans: "Geist Variable", sans-serif;
  --breakpoint-docs: 74rem;
  --docs-grid-columns: 14rem minmax(0, 1fr) 12rem;
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
