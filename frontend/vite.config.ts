import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
    port: parseInt(process.env.VITE_PORT || '5173'),
    host: '0.0.0.0',  // Allow connections from any host
    allowedHosts: ['dev.skenzeriq.com', 'localhost'],
    hmr: {
      host: 'localhost',
      port: parseInt(process.env.PUBLIC_PORT || '3500'),
      protocol: 'ws',
    },
    strictPort: true,
    proxy: {
      // Proxy API requests to backend for local development
      '/v1': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
