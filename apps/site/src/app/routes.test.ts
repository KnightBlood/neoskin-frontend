import { describe, expect, it } from 'vitest'
import { routePaths, routes } from './routes'

describe('site routes', () => {
  it('covers the P0 page list', () => {
    for (const path of [
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
    ]) {
      expect(routePaths).toContain(path)
    }
  })

  it('mounts every route under the site layout', () => {
    expect(routes).toHaveLength(1)
    expect(routes[0]?.children?.length).toBeGreaterThanOrEqual(10)

    const userRoute = routes[0]?.children?.find((route) => route.path === 'user')
    expect(userRoute?.children?.map((route) => route.path ?? '(index)')).toEqual([
      '(index)',
      'profile',
      'player',
      'closet',
      'inbox',
      'inbox/:id',
      'reports',
      'oauth/manage',
    ])
  })
})
