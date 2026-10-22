import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.UI_PORT || process.env.UI_PORT || '5173', 10);

  return {
    plugins: [react()],
    server: {
      host: true,
      port: port,
      open: false,
    },
    preview: {
      host: true,
      port: port,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
