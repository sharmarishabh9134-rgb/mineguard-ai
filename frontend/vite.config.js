import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The browser API helper appends /api itself; Vite's proxy target must be
  // the backend origin even when VITE_API_URL is supplied with an /api suffix.
  const apiTarget = (env.VITE_API_URL || `http://127.0.0.1:${env.API_PORT || '5002'}`)
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': apiTarget
      }
    }
  }
})
