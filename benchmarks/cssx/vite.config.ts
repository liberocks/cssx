import cssx from '@cssxio/unplugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cssx({
      cssFileName: 'cssx.css',
      sourceMap: false,
      theme: '@theme { --font-display: Georgia, "Times New Roman", serif; }',
    }),
    react(),
  ],
  build: { manifest: true, sourcemap: false },
});
