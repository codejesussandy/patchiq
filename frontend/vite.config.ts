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
    port: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
    host: '0.0.0.0',  // Allow connections from any host
    allowedHosts: ['dev.skenzeriq.com', 'localhost'],
    hmr: {
      // Use client-side detection for HMR
      clientPort: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
    },
    strictPort: false,
    proxy: {
      // Proxy API requests to backend for local development
      '/v1': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
