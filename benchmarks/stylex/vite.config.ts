import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [stylex.vite({ dev: false, runtimeInjection: false }), react()],
  build: { manifest: true, sourcemap: false },
});
