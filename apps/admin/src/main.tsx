import 'antd/dist/reset.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import {
  createHttpClient,
  initI18n,
  readBootstrap,
  readCsrfToken,
  themeTokens,
} from '@neoskin/core'
import { AppProviders } from './app/providers'
import { createRouter } from './app/routes'

async function boot() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('缺少 #root')
  }
  const root = createRoot(rootElement)

  try {
    const bootstrap = await readBootstrap()
    if (bootstrap.mode !== 'admin') {
      throw new Error(`bootstrap.mode=${bootstrap.mode}，当前入口需要 admin`)
    }
    if (!bootstrap.user) {
      location.replace(`/app-next/site/auth/login?redirect=${encodeURIComponent('/app-next/admin/')}`)
      return
    }
    if (!bootstrap.user.isAdmin) {
      root.render(
        <div className="boot-error">
          <h1>403</h1>
          <p>当前账号没有管理端权限。</p>
          <p>
            返回 <a href="/app-next/site/">站点首页</a>
          </p>
        </div>,
      )
      return
    }
    document.title = `${bootstrap.siteName} · Admin`
    document.documentElement.lang = bootstrap.locale.replace('_', '-')
    const tokens = themeTokens({
      navbarColor: String(bootstrap.options.navbar_color ?? ''),
      darkMode: bootstrap.user?.darkMode === true,
    })
    document.documentElement.dataset.theme = tokens.dark ? 'dark' : 'light'

    const http = createHttpClient({
      baseURL: bootstrap.apiBase,
      csrfToken: readCsrfToken(bootstrap),
      onUnauthenticated() {
        location.assign(`/auth/login?redirect=${encodeURIComponent(location.pathname)}`)
      },
      onCsrfExpired() {
        location.reload()
      },
    })
    // 标识管理端 SPA：后端据此在写操作返回 JSON（而不是 302 回旧页面）。
    http.raw.defaults.headers.common['X-Neoskin-Spa'] = '1'
    const i18n = await initI18n(bootstrap).catch(() => null)
    if (i18n) {
      document.documentElement.lang = i18n.language.replace('_', '-')
    }

    root.render(
      <StrictMode>
        <AppProviders value={{ bootstrap, http }} i18n={i18n}>
          <RouterProvider router={createRouter(bootstrap.basePath)} />
        </AppProviders>
      </StrictMode>,
    )
  } catch (error) {
    root.render(
      <div className="boot-error">
        <h1>管理端启动失败</h1>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        <p>请确认后端已实现 `/app-next/admin/*` SPA 壳与 `/api/bootstrap`。</p>
      </div>,
    )
  }
}

void boot()
