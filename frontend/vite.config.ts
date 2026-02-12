import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://192.168.68.63:8000'
  const wsUrl = apiUrl.replace(/^http/, 'ws')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': { target: apiUrl, changeOrigin: true },
        '/ws': { target: wsUrl, ws: true },
      },
    },
  }
})
