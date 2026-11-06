// 本地 P0 壳预览：静态托管两个 app，并注入契约 v1 的 bootstrap。
// 用法：node scripts/mock-server.mjs [--port 4175]
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
const portIndex = args.indexOf('--port')
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 4175
const root = resolve(import.meta.dirname, '..')

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

function bootstrap(mode) {
  return {
    contractVersion: 1,
    apiBase: '',
    locale: 'zh_CN',
    localeFallback: 'en',
    siteName: 'NeoSkin',
    version: '6.0.11_patch',
    basePath: `/app-next/${mode}/`,
    mode,
    csrfToken: 'mock-csrf-token',
    user: {
      uid: 1,
      email: 'admin@example.com',
      nickname: 'Admin',
      avatar: '/avatar/1',
      score: 1000,
      permission: 2,
      verified: true,
      isAdmin: true,
      isBanned: false,
      darkMode: false,
    },
    options: { site_name: 'NeoSkin', site_description: 'NeoSkin frontend preview' },
    features: {
      registration: true,
      emailVerification: false,
      passwordReset: false,
      oauth: true,
      reports: true,
      plugins: true,
    },
    plugins: { menus: [], badges: [], styles: [], scripts: [] },
  }
}

function shell(html, mode) {
  const payload = JSON.stringify(bootstrap(mode)).replaceAll('<', '\\u003c')
  return html
    .replace('</head>', `  <meta name="csrf-token" content="mock-csrf-token">\n  <script id="neoskin-bootstrap" type="application/json">${payload}</script>\n</head>`)
    .replace(/<title>.*<\/title>/, `<title>${mode === 'admin' ? 'NeoSkin Admin' : 'NeoSkin'}</title>`)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
  const path = url.pathname

  if (path === '/api/bootstrap') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ code: 0, message: 'ok', data: bootstrap('site') }))
    return
  }
  if (path.startsWith('/lang/')) {
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
    response.end('blessing.i18n = {};')
    return
  }

  const match = /^\/app-next\/(site|admin)(\/.*)?$/.exec(path)
  if (!match) {
    response.writeHead(404).end('not found')
    return
  }
  const mode = match[1]
  const relative = match[2] ?? '/'
  const dist = join(root, 'apps', mode, 'dist')

  if (relative === '/' || relative === '' || !extname(relative)) {
    const html = await readFile(join(dist, 'index.html'), 'utf8')
    response.writeHead(200, { 'Content-Type': contentTypes['.html'], 'Cache-Control': 'no-cache' })
    response.end(shell(html, mode))
    return
  }

  try {
    const file = await readFile(join(dist, relative))
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(relative)] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    response.end(file)
  } catch {
    response.writeHead(404).end('not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`mock frontend: http://127.0.0.1:${port}/app-next/site/`)
  console.log(`mock admin:    http://127.0.0.1:${port}/app-next/admin/`)
})
