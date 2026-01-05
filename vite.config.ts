import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'  // ← បន្ថែម line នេះ

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],  // ← បន្ថែម tailwindcss() ទីនេះ
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
  },
})