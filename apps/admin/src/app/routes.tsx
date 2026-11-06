import { createBrowserRouter, type RouteObject } from 'react-router'
import { AdminLayout } from './layout'
import {
  CommunicationEditPage,
  CommunicationsPage,
  CustomizePage,
  DashboardPage,
  I18nPage,
  MarketPage,
  NotFoundPage,
  OptionsPage,
  PlayersPage,
  PluginsPage,
  ReportsPage,
  ResourcePage,
  ScorePage,
  StatusPage,
  UpdatePage,
  UsersPage,
} from '../pages/pages'

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
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'options', element: <OptionsPage /> },
      { path: 'customize', element: <CustomizePage /> },
      { path: 'score', element: <ScorePage /> },
      { path: 'resource', element: <ResourcePage /> },
      { path: 'communications', element: <CommunicationsPage /> },
      { path: 'communications/:id', element: <CommunicationEditPage /> },
      { path: 'i18n', element: <I18nPage /> },
      { path: 'plugins/manage', element: <PluginsPage /> },
      { path: 'plugins/market', element: <MarketPage /> },
      { path: 'status', element: <StatusPage /> },
      { path: 'update', element: <UpdatePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createRouter(basePath: string) {
  const basename = basePath.replace(/\/+$/, '') || '/'
  return createBrowserRouter(routes, { basename })
}
