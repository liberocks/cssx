import { defineConfig } from 'tsup';

export default defineConfig({ external: ['magic-string'], shims: true });
