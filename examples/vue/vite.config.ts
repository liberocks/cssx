import cssx from '@cssxio/unplugin/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    cssx({
      cssFileName: 'cssx.css',
      theme: '@theme reference { --color-brand: #42b883; --font-display: ui-rounded, system-ui, sans-serif; }',
    }),
    vue(),
  ],
});
