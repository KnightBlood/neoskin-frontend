import { describe, expect, it } from 'vitest'
import type { HttpClient } from '@neoskin/core'
import {
  EndpointUnavailableError,
  addPlayer,
  clearPlayerTextures,
  fetchCloset,
  fetchInbox,
  fetchInboxMessage,
  fetchPlayers,
  fetchReports,
  fetchScoreInfo,
  isPaginatorLike,
  updateProfile,
  updateOAuthClient,
} from './user'

interface Call {
  method: string
  url: string
  body?: unknown
  config?: unknown
}

function fakeHttp(result: unknown = undefined) {
  const calls: Call[] = []
  const http = {
    raw: {},
    setCsrfToken() {},
    get: async (url: string, config?: unknown) => {
      calls.push({ method: 'get', url, config })
      return result as never
    },
    post: async (url: string, body?: unknown, config?: unknown) => {
      calls.push({ method: 'post', url, body, config })
      return result as never
    },
    put: async (url: string, body?: unknown, config?: unknown) => {
      calls.push({ method: 'put', url, body, config })
      return result as never
    },
    delete: async (url: string, config?: unknown) => {
      calls.push({ method: 'delete', url, config })
      return result as never
    },
  } as unknown as HttpClient
  return { http, calls }
}

describe('user API', () => {
  it('reads score info and players', async () => {
    const { http, calls } = fakeHttp()
    await fetchScoreInfo(http)
    await fetchPlayers(http)
    expect(calls.map((call) => call.url)).toEqual(['/user/score-info', '/user/player/list'])
  })

  it('posts profile actions with the query string PHP expects', async () => {
    const { http, calls } = fakeHttp({ code: 0, message: 'ok' })
    await updateProfile(http, 'nickname', { new_nickname: 'Steve' })
    expect(calls[0]).toMatchObject({
      method: 'post',
      url: '/user/profile?action=nickname',
      body: { new_nickname: 'Steve' },
    })
  })

  it('adds players and clears texture flags via query params', async () => {
    const { http, calls } = fakeHttp()
    await addPlayer(http, 'Notch')
    await clearPlayerTextures(http, 7, ['skin', 'cape'])
    expect(calls[0]).toMatchObject({ method: 'post', url: '/user/player', body: { name: 'Notch' } })
    expect(calls[1]).toMatchObject({
      method: 'delete',
      url: '/user/player/7/textures',
      config: { params: { skin: 'true', cape: 'true' } },
    })
  })

  it('sends closet pagination parameters', async () => {
    const { http, calls } = fakeHttp({ data: [], last_page: 1 })
    await fetchCloset(http, { category: 'cape', q: 'fire', page: 2, perPage: 12 })
    expect(calls[0]?.config).toMatchObject({
      params: { category: 'cape', q: 'fire', page: 2, perPage: 12 },
    })
  })

  it('updates OAuth clients with both fields', async () => {
    const { http, calls } = fakeHttp({ id: 1, name: 'App', redirect: 'https://a' })
    await updateOAuthClient(http, 1, { name: 'App2', redirect: 'https://b' })
    expect(calls[0]).toMatchObject({
      method: 'put',
      url: '/oauth/clients/1',
      body: { name: 'App2', redirect: 'https://b' },
    })
  })

  it('detects paginator payloads', () => {
    expect(isPaginatorLike({ data: [], last_page: 1 })).toBe(true)
    expect(isPaginatorLike({ data: [] })).toBe(false)
    expect(isPaginatorLike('<html></html>')).toBe(false)
  })

  it('throws EndpointUnavailableError when the backend returns HTML', async () => {
    const { http } = fakeHttp('<html>legacy page</html>')
    await expect(fetchInbox(http, 1)).rejects.toBeInstanceOf(EndpointUnavailableError)
    await expect(fetchReports(http, 1)).rejects.toBeInstanceOf(EndpointUnavailableError)
  })

  it('passes paginator data through when available', async () => {
    const { http, calls } = fakeHttp({
      data: [{ id: 'a' }],
      last_page: 1,
      current_page: 1,
      per_page: 10,
      total: 1,
    })
    const page = await fetchInbox(http, 2)
    expect(page.data[0]).toMatchObject({ id: 'a' })
    expect(calls[0]?.config).toMatchObject({ params: { page: 2, per_page: 10 } })
  })

  it('unwraps the inbox message envelope', async () => {
    const { http, calls } = fakeHttp({
      code: 0,
      data: { id: 1, title: '公告', content: '<p>hi</p>', read_at: null, created_at: '' },
    })
    const message = await fetchInboxMessage(http, '1')
    expect(message.content).toBe('<p>hi</p>')
    expect(calls[0]?.url).toBe('/api/user/inbox/1')
  })
})
