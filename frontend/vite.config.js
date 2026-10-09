import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_API_URL can be set in frontend/.env.local to override the proxy target.
// Defaults to http://127.0.0.1:5002 for local dev (matches dev.js API_PORT).
const apiTarget = process.env.VITE_API_URL || `http://127.0.0.1:${process.env.API_PORT || '5002'}`;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': apiTarget
    }
  }
})
