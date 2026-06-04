import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Підвантажуємо .env, .env.[mode], .env.local (усі змінні, без префіксного фільтра)
  const env = loadEnv(mode, process.cwd(), '');

  const isProd = mode === 'production';

  // Пріоритет джерел:
  //   1) реальна змінна оточення  (Docker build arg на проді)
  //   2) .env / .env.[mode] файл  (локальна розробка)
  //   3) дефолт на localhost       (тільки для dev, щоб `npm run dev` просто працював)
  const API_URL =
    process.env.VITE_API_URL ||
    env.VITE_API_URL ||
    (isProd ? undefined : 'http://localhost:8000');

  const WS_URL =
    process.env.VITE_WS_URL ||
    env.VITE_WS_URL ||
    (isProd ? undefined : 'ws://localhost:8000');

  // На проді URL мають бути задані явно (через build args) — інакше падаємо голосно.
  if (!API_URL || !WS_URL) {
    throw new Error('❌ VITE_API_URL або VITE_WS_URL не встановлено!');
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(API_URL),
      'import.meta.env.VITE_WS_URL': JSON.stringify(WS_URL),
    },
    server: {
      host: true,   // доступ із телефона в тій самій мережі (http://<твій-IP>:5173)
      port: 5173,
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          format: 'es',
        },
      },
    },
  };
});