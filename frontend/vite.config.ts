import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '5001', 10),
    host: '0.0.0.0',  // Allow connections from any host
    allowedHosts: ['localhost', '127.0.0.1', 'dev.skenzeriq.com', '.skenzeriq.com'],
    hmr: {
      // Let the client detect the correct host automatically
      // This enables HMR to work whether accessed via localhost, IP, or domain
      host: undefined,
      clientPort: undefined,
    },
    strictPort: true,
    proxy: {
      // Proxy API requests to backend for local development (only used when running outside Docker)
      '/v1': {
        target: process.env.VITE_BACKEND_URL || 'http://backend:5002',
        changeOrigin: true,
      },
    },
  },
})
