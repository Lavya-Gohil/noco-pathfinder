import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative base so the build works at any GitHub Pages path (/<repo>/).
  base: './',
  plugins: [react(), tailwindcss()],
  // Publish the notices that the bundled open-source packages require.
  build: { license: { fileName: 'third-party-licenses.md' } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
