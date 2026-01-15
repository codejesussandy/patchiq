import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      protocol: 'ws',
      host: '192.168.1.2',
      port: 3000,
    },
    allowedHosts: ['.'],
    strictPort: false,
  },
})
