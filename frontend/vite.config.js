import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local dev only: forwards /api calls to the backend running on 5000.
      // In production this same job is done by nginx (the DevOps side
      // will set that up) so the frontend code never needs to change
      // between environments.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
