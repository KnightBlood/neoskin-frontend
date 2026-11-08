import { createBrowserRouter, type RouteObject } from 'react-router'
import { lazy, Suspense, type ReactElement } from 'react'
import { AdminLayout } from './layout'

// 路由级代码分割：首屏只加载布局与仪表盘，其余页面按需加载。
const NotFoundPage = lazy(() =>
  import('../pages/pages').then((m) => ({ default: m.NotFoundPage })),
)
const DashboardPage = lazy(() =>
  import('../pages/dashboard').then((m) => ({ default: m.DashboardPage })),
)
const UsersPage = lazy(() => import('../pages/users').then((m) => ({ default: m.UsersPage })))
const PlayersPage = lazy(() =>
  import('../pages/players').then((m) => ({ default: m.PlayersPage })),
)
const ReportsPage = lazy(() =>
  import('../pages/reports').then((m) => ({ default: m.ReportsPage })),
)
const StatusPage = lazy(() => import('../pages/status').then((m) => ({ default: m.StatusPage })))
const I18nPage = lazy(() => import('../pages/i18n').then((m) => ({ default: m.I18nPage })))
const PluginsPage = lazy(() =>
  import('../pages/plugins').then((m) => ({ default: m.PluginsPage })),
)
const MarketPage = lazy(() => import('../pages/market').then((m) => ({ default: m.MarketPage })))
const OptionsPage = lazy(() =>
  import('../pages/options').then((m) => ({ default: m.OptionsPage })),
)
const UpdatePage = lazy(() => import('../pages/update').then((m) => ({ default: m.UpdatePage })))
const CommunicationsPage = lazy(() =>
  import('../pages/communications').then((m) => ({ default: m.CommunicationsPage })),
)
const CommunicationEditPage = lazy(() =>
  import('../pages/communication-edit').then((m) => ({ default: m.CommunicationEditPage })),
)

function RouteFallback() {
  return <div className="route-loading">加载中…</div>
}

function withSuspense(element: ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const routePaths = [
  '/',
  '/users',
  '/players',
  '/reports',
  '/options',
  '/customize',
  '/score',
  '/resource',
  '/communications',
  '/communications/new',
  '/communications/announcement',
  '/communications/:id',
  '/i18n',
  '/plugins/manage',
  '/plugins/market',
  '/status',
  '/update',
  '*',
] as const

export const routes: RouteObject[] = [
  {
    element: <AdminLayout />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'users', element: withSuspense(<UsersPage />) },
      { path: 'players', element: withSuspense(<PlayersPage />) },
      { path: 'reports', element: withSuspense(<ReportsPage />) },
      { path: 'options', element: withSuspense(<OptionsPage group="options" />) },
      { path: 'customize', element: withSuspense(<OptionsPage group="customize" />) },
      { path: 'score', element: withSuspense(<OptionsPage group="score" />) },
      { path: 'resource', element: withSuspense(<OptionsPage group="resource" />) },
      { path: 'communications', element: withSuspense(<CommunicationsPage />) },
      { path: 'communications/new', element: withSuspense(<CommunicationEditPage variant="new" />) },
      {
        path: 'communications/announcement',
        element: withSuspense(<CommunicationEditPage variant="announcement" />),
      },
      { path: 'communications/:id', element: withSuspense(<CommunicationEditPage variant="edit" />) },
      { path: 'i18n', element: withSuspense(<I18nPage />) },
      { path: 'plugins/manage', element: withSuspense(<PluginsPage />) },
      { path: 'plugins/market', element: withSuspense(<MarketPage />) },
      { path: 'status', element: withSuspense(<StatusPage />) },
      { path: 'update', element: withSuspense(<UpdatePage />) },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]

export function createRouter(basePath: string) {
  const basename = basePath.replace(/\/+$/, '') || '/'
  return createBrowserRouter(routes, { basename })
}
