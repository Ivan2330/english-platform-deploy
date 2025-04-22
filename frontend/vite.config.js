import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// ✅ прочитати значення з process.env
const API_URL = process.env.VITE_API_URL || '';
const WS_URL = process.env.VITE_WS_URL || '';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(API_URL),
    'import.meta.env.VITE_WS_URL': JSON.stringify(WS_URL)
  },
  server: {
    host: true,
    proxy: {
      '/auth': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/auth'),
        secure: false,
      },
      '/users': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/users/, '/users'),
        secure: false,
      },
    },
  },
});
