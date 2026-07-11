import { vitePlugin as remix } from '@remix-run/dev';
import cssx from '@cssxio/unplugin/vite';
import { defineConfig } from 'vite';

const theme = `
@theme reference {
  --color-brand: #ea580c;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
`;

export default defineConfig({
  plugins: [
    cssx({ cssFileName: 'cssx.css', theme }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_lazyRouteDiscovery: true,
        v3_relativeSplatPath: true,
        v3_singleFetch: true,
        v3_throwAbortReason: true,
      },
    }),
  ],
});
