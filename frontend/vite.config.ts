import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { authSyncPlugin } from './vite-auth-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), authSyncPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
