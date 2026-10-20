import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), 'BACKEND_');
  const upstream = new URL(process.env.BACKEND_UPSTREAM || env.BACKEND_UPSTREAM || 'http://localhost:8000');
  const prefix = upstream.pathname.replace(/\/$/, '');
  const backendProxy: ProxyOptions = {
    target: upstream.origin,
    changeOrigin: true,
    secure: true,
    configure: (proxy) => {
      proxy.on('proxyRes', (response) => {
        const location = response.headers.location;
        const base = `${upstream.origin}${prefix}`;
        if (location?.startsWith(`${base}/`)) {
          response.headers.location = location.slice(base.length);
        }
      });
    },
    rewrite: (requestPath: string) => `${prefix}${requestPath}`,
  };
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': backendProxy,
        '/media': backendProxy,
      },
    },
  };
});
