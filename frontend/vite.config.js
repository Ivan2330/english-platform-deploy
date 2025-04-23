import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    'import.meta.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || '')
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        format: 'es'   // 🛠️ Власне ця стрічка вирішує твою помилку!
      }
    }
  },
  server: {
    host: true,
    proxy: {
      '/auth': {
        target: import.meta.env.VITE_API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/auth'),
        secure: false,
      },
      '/users': {
        target: import.meta.env.VITE_API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/users/, '/users'),
        secure: false,
      },
    },
  },
});
