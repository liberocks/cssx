import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssx from '@cssxio/unplugin/vite';

const theme = `
@theme reference {
  --color-brand: #646cff;
  --font-display: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
  --animate-logo-spin: logo-spin 20s linear infinite;

  @keyframes logo-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
}
`;

export default defineConfig({
  plugins: [cssx({ cssFileName: 'cssx.css', theme }), react()],
});
