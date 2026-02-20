import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const rootDir = path.resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from root .env (with VITE_ prefix exposed to client)
  const env = loadEnv(mode, rootDir, '')

  return {
    envDir: rootDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-antd': ['antd', '@ant-design/icons'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-charts': ['recharts'],
          },
        },
      },
    },
    server: {
      port: parseInt(env.VITE_PORT || '3001'),
      host: '0.0.0.0',
      allowedHosts: [env.PUBLIC_HOST, 'localhost'].filter(Boolean),
      hmr: {
        clientPort: parseInt(env.PUBLIC_PORT || '3001'),
        host: env.HMR_HOST || 'localhost',
        protocol: 'ws',
      },
      strictPort: true,
      proxy: {
        '/v1': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3007',
          changeOrigin: true,
        },
      },
    },
  }
})
