import { createBrowserRouter, type RouteObject } from 'react-router'
import { AdminLayout } from './layout'
import {
  NotFoundPage,
} from '../pages/pages'
import { DashboardPage } from '../pages/dashboard'
import { UsersPage } from '../pages/users'
import { PlayersPage } from '../pages/players'
import { ReportsPage } from '../pages/reports'
import { StatusPage } from '../pages/status'
import { I18nPage } from '../pages/i18n'
import { PluginsPage } from '../pages/plugins'
import { MarketPage } from '../pages/market'
import { OptionsPage } from '../pages/options'
import { UpdatePage } from '../pages/update'
import { CommunicationsPage } from '../pages/communications'
import { CommunicationEditPage } from '../pages/communication-edit'

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
      { index: true, element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'options', element: <OptionsPage group="options" /> },
      { path: 'customize', element: <OptionsPage group="customize" /> },
      { path: 'score', element: <OptionsPage group="score" /> },
      { path: 'resource', element: <OptionsPage group="resource" /> },
      { path: 'communications', element: <CommunicationsPage /> },
      { path: 'communications/new', element: <CommunicationEditPage variant="new" /> },
      {
        path: 'communications/announcement',
        element: <CommunicationEditPage variant="announcement" />,
      },
      { path: 'communications/:id', element: <CommunicationEditPage variant="edit" /> },
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
