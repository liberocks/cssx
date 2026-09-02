import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import cssx from '@cssxio/unplugin/vite';

export default defineConfig({
  base: './',
  plugins: [react(), cssx()],
});
