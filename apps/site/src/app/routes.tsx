import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router'
import { lazy, Suspense, type ReactElement } from 'react'
import { SiteLayout } from './layout'
import { useApp } from './context'

// 路由级代码分割：首屏只加载布局与当前页面。
const HomePage = lazy(() => import('../pages/pages').then((m) => ({ default: m.HomePage })))
const NotFoundPage = lazy(() =>
  import('../pages/pages').then((m) => ({ default: m.NotFoundPage })),
)
const SkinlibListPage = lazy(() =>
  import('../pages/skinlib/list').then((m) => ({ default: m.SkinlibListPage })),
)
const SkinlibDetailPage = lazy(() =>
  import('../pages/skinlib/detail').then((m) => ({ default: m.SkinlibDetailPage })),
)
const SkinlibUploadPage = lazy(() =>
  import('../pages/skinlib/upload').then((m) => ({ default: m.SkinlibUploadPage })),
)
const UserShell = lazy(() =>
  import('../pages/user/shell').then((m) => ({ default: m.UserShell })),
)
const UserDashboardPage = lazy(() =>
  import('../pages/user/dashboard').then((m) => ({ default: m.UserDashboardPage })),
)
const ProfilePage = lazy(() =>
  import('../pages/user/profile').then((m) => ({ default: m.ProfilePage })),
)
const PlayersPage = lazy(() =>
  import('../pages/user/players').then((m) => ({ default: m.PlayersPage })),
)
const ClosetPage = lazy(() =>
  import('../pages/user/closet').then((m) => ({ default: m.ClosetPage })),
)
const InboxPage = lazy(() =>
  import('../pages/user/inbox').then((m) => ({ default: m.InboxPage })),
)
const InboxMessagePage = lazy(() =>
  import('../pages/user/inbox').then((m) => ({ default: m.InboxMessagePage })),
)
const ReportsPage = lazy(() =>
  import('../pages/user/reports').then((m) => ({ default: m.ReportsPage })),
)
const OAuthPage = lazy(() =>
  import('../pages/user/oauth').then((m) => ({ default: m.OAuthPage })),
)
const ForgotPage = lazy(() =>
  import('../pages/auth').then((m) => ({ default: m.ForgotPage })),
)
const LoginPage = lazy(() =>
  import('../pages/auth').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('../pages/auth').then((m) => ({ default: m.RegisterPage })),
)
const ResetPage = lazy(() =>
  import('../pages/auth').then((m) => ({ default: m.ResetPage })),
)

function RouteFallback() {
  return <div className="route-loading">加载中…</div>
}

function withSuspense(element: ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

/** 需要登录的页面：未登录跳转登录页并带上回跳地址。 */
function RequireAuth({ children }: { children: ReactElement }) {
  const { bootstrap } = useApp()
  const location = useLocation()
  if (!bootstrap.user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/login?redirect=${redirect}`} replace />
  }
  return children
}

export const routePaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot',
  '/auth/reset/:uid',
  '/skinlib',
  '/skinlib/show/:tid',
  '/skinlib/upload',
  '/user',
  '/user/profile',
  '/user/player',
  '/user/closet',
  '/user/inbox',
  '/user/inbox/:id',
  '/user/reports',
  '/user/oauth/manage',
  '*',
] as const

export const routes: RouteObject[] = [
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'auth/login', element: withSuspense(<LoginPage />) },
      { path: 'auth/register', element: withSuspense(<RegisterPage />) },
      { path: 'auth/forgot', element: withSuspense(<ForgotPage />) },
      { path: 'auth/reset/:uid', element: withSuspense(<ResetPage />) },
      { path: 'skinlib', element: withSuspense(<SkinlibListPage />) },
      { path: 'skinlib/show/:tid', element: withSuspense(<SkinlibDetailPage />) },
      {
        path: 'skinlib/upload',
        element: withSuspense(
          <RequireAuth>
            <SkinlibUploadPage />
          </RequireAuth>,
        ),
      },
      {
        path: 'user',
        element: withSuspense(
          <RequireAuth>
            <UserShell />
          </RequireAuth>,
        ),
        children: [
          { index: true, element: <UserDashboardPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'player', element: <PlayersPage /> },
          { path: 'closet', element: <ClosetPage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'inbox/:id', element: <InboxMessagePage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'oauth/manage', element: <OAuthPage /> },
        ],
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]

export function createRouter(basePath: string) {
  const basename = basePath.replace(/\/+$/, '') || '/'
  return createBrowserRouter(routes, { basename })
}
