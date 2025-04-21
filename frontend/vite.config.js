import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { API_URL } from './config';


export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/auth": {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, "/auth"),
        secure: false,
      },
      "/users": {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/users/, "/users"),
        secure: false,
      },
    },
  },
});
