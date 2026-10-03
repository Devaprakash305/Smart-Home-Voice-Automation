import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
const workerTarget = 'https://smart-home-api.devaprakashsaravanan2007.workers.dev'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || '.', './src'),
    },
  },
  server: {
    proxy: {
      '/device': {
        target: workerTarget,
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: workerTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})

