import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the build works at any GitHub Pages path (/<repo>/).
  base: './',
  plugins: [react(), tailwindcss()],
})
