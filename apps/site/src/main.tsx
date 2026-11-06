import 'tdesign-react/es/style/index.css'
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
    if (bootstrap.mode !== 'site') {
      throw new Error(`bootstrap.mode=${bootstrap.mode}，当前入口需要 site`)
    }
    document.title = bootstrap.siteName
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
        const redirect = encodeURIComponent(location.pathname)
        location.assign(`/auth/login?redirect=${redirect}`)
      },
      onCsrfExpired() {
        location.reload()
      },
    })
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
        <h1>前端启动失败</h1>
        <p>{error instanceof Error ? error.message : String(error)}</p>
        <p>请确认后端已实现 SPA 壳与 `/api/bootstrap`，或切回 `FRONTEND_MODE=legacy`。</p>
      </div>,
    )
  }
}

void boot()
