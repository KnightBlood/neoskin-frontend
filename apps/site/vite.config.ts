import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/app-next/site/',
  plugins: [react()],
  server: {
    port: 5173,
    // 开发期把后端路由全部转发到本地端口（SPA 自身资源在 /app-next/site 下）。
    proxy: Object.fromEntries(
      [
        '/api',
        '/auth',
        '/lang',
        '/avatar',
        '/preview',
        '/textures',
        '/skinlib',
        '/texture',
        '/raw',
        '/csl',
        '/user',
        '/oauth',
        '/player',
        '/admin',
        '/setup',
      ].map((path) => [path, 'http://127.0.0.1:8080']),
    ),
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
