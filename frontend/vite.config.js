import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const API_URL = process.env.VITE_API_URL;
  const WS_URL = process.env.VITE_WS_URL;

  if (!API_URL || !WS_URL) {
    throw new Error("❌ VITE_API_URL або VITE_WS_URL не встановлено!");
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(API_URL),
      'import.meta.env.VITE_WS_URL': JSON.stringify(WS_URL),
    },
    server: {
      host: true,
      proxy: {
        '/auth': {
          target: API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth/, '/auth'),
        },
        '/users': {
          target: API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/users/, '/users'),
        },
      },
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          format: 'es', // 👈 це прибере попередження про import.meta
        },
      },
    },
  };
});
