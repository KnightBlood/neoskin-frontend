import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/app-next/site/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/auth': 'http://127.0.0.1:8080',
      '/lang': 'http://127.0.0.1:8080',
      '/avatar': 'http://127.0.0.1:8080',
      '/preview': 'http://127.0.0.1:8080',
      '/textures': 'http://127.0.0.1:8080',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
