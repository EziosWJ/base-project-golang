import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        // Development talks to the Go API through the same origin. Override the
        // target for parallel work, e.g. VITE_API_PROXY_TARGET=http://127.0.0.1:8100.
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8150',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});
