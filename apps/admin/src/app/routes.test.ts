import { describe, expect, it } from 'vitest'
import { routePaths, routes } from './routes'

describe('admin routes', () => {
  it('covers the P0 admin page list', () => {
    for (const path of [
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
    ]) {
      expect(routePaths).toContain(path)
    }
  })

  it('mounts every route under the admin layout', () => {
    expect(routes).toHaveLength(1)
    expect(routes[0]?.children?.length).toBeGreaterThanOrEqual(15)
  })
})
