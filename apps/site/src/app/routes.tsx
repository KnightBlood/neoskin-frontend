import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router'
import type { ReactElement } from 'react'
import { SiteLayout } from './layout'
import { useApp } from './context'
import {
  ClosetPage,
  HomePage,
  InboxPage,
  NotFoundPage,
  OAuthPage,
  PlayersPage,
  ProfilePage,
  ReportsPage,
  UserDashboardPage,
} from '../pages/pages'
import { SkinlibListPage } from '../pages/skinlib/list'
import { SkinlibDetailPage } from '../pages/skinlib/detail'
import { SkinlibUploadPage } from '../pages/skinlib/upload'
import {
  ForgotPage,
  LoginPage,
  RegisterPage,
  ResetPage,
} from '../pages/auth'

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
  '/user/reports',
  '/user/oauth/manage',
  '*',
] as const

export const routes: RouteObject[] = [
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'auth/login', element: <LoginPage /> },
      { path: 'auth/register', element: <RegisterPage /> },
      { path: 'auth/forgot', element: <ForgotPage /> },
      { path: 'auth/reset/:uid', element: <ResetPage /> },
      { path: 'skinlib', element: <SkinlibListPage /> },
      { path: 'skinlib/show/:tid', element: <SkinlibDetailPage /> },
      {
        path: 'skinlib/upload',
        element: (
          <RequireAuth>
            <SkinlibUploadPage />
          </RequireAuth>
        ),
      },
      {
        path: 'user',
        element: (
          <RequireAuth>
            <UserDashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: 'user/profile',
        element: (
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        ),
      },
      {
        path: 'user/player',
        element: (
          <RequireAuth>
            <PlayersPage />
          </RequireAuth>
        ),
      },
      {
        path: 'user/closet',
        element: (
          <RequireAuth>
            <ClosetPage />
          </RequireAuth>
        ),
      },
      {
        path: 'user/inbox',
        element: (
          <RequireAuth>
            <InboxPage />
          </RequireAuth>
        ),
      },
      {
        path: 'user/reports',
        element: (
          <RequireAuth>
            <ReportsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'user/oauth/manage',
        element: (
          <RequireAuth>
            <OAuthPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createRouter(basePath: string) {
  const basename = basePath.replace(/\/+$/, '') || '/'
  return createBrowserRouter(routes, { basename })
}
