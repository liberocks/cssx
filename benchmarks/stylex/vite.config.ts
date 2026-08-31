import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

export default defineConfig({
  plugins: [stylex.vite({ dev: false, runtimeInjection: false }), react()],
  build: { manifest: true, sourcemap: false },
});
