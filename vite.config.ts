import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/cv': {
        target: 'http://cv-backend:8000', // CV Backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cv/, '')
      },
      '/api/nlp': {
        target: 'http://nlp-backend:8001', // NLP Backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nlp/, '')
      }
    }
  }
})
