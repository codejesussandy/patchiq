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
    port: 5173,
    host: '0.0.0.0',  // Allow connections from any host
    hmr: {
      // HMR through nginx reverse proxy
      clientPort: 5173,
      protocol: 'ws',
    },
    strictPort: false,
  },
})
