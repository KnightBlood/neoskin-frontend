import { describe, expect, it } from 'vitest'
import type { HttpClient } from '@neoskin/core'
import {
  buildLibraryParams,
  fetchLibrary,
  normalizeFilter,
  normalizePage,
  normalizeSort,
  normalizeUploader,
  uploadTexture,
} from './skinlib'

interface Call {
  method: string
  url: string
  body?: unknown
  config?: unknown
}

function fakeHttp() {
  const calls: Call[] = []
  const http = {
    raw: {},
    setCsrfToken() {},
    get: async (url: string, config?: unknown) => {
      calls.push({ method: 'get', url, config })
      return undefined as never
    },
    post: async (url: string, body?: unknown, config?: unknown) => {
      calls.push({ method: 'post', url, body, config })
      return undefined as never
    },
    put: async (url: string, body?: unknown, config?: unknown) => {
      calls.push({ method: 'put', url, body, config })
      return undefined as never
    },
    delete: async (url: string, config?: unknown) => {
      calls.push({ method: 'delete', url, config })
      return undefined as never
    },
  } as unknown as HttpClient
  return { http, calls }
}

describe('skinlib API', () => {
  it('normalizes query values', () => {
    expect(normalizeFilter('alex')).toBe('alex')
    expect(normalizeFilter('unknown')).toBe('skin')
    expect(normalizeSort('likes')).toBe('likes')
    expect(normalizeSort('')).toBe('time')
    expect(normalizePage('3')).toBe(3)
    expect(normalizePage('-1')).toBe(1)
    expect(normalizeUploader('9')).toBe(9)
    expect(normalizeUploader('x')).toBe(0)
  })

  it('omits empty keyword/uploader from library params', () => {
    expect(buildLibraryParams({ filter: 'skin', sort: 'time', page: 1 })).toEqual({
      filter: 'skin',
      sort: 'time',
      page: 1,
    })
    expect(
      buildLibraryParams({ filter: 'cape', keyword: 'hero', sort: 'likes', uploader: 5, page: 2 }),
    ).toEqual({
      filter: 'cape',
      sort: 'likes',
      page: 2,
      keyword: 'hero',
      uploader: 5,
    })
  })

  it('requests the library with params', async () => {
    const { http, calls } = fakeHttp()
    await fetchLibrary(http, { filter: 'steve', keyword: 'x', sort: 'likes', page: 2 })
    expect(calls[0]).toMatchObject({ method: 'get', url: '/skinlib/list' })
    expect(calls[0]?.config).toMatchObject({
      params: { filter: 'steve', sort: 'likes', page: 2, keyword: 'x' },
    })
  })

  it('uploads multipart fields', async () => {
    const { http, calls } = fakeHttp()
    const file = new File(['png'], 'skin.png', { type: 'image/png' })
    await uploadTexture(http, { name: 'Hero', type: 'alex', file, isPublic: false })
    const call = calls[0]
    expect(call).toMatchObject({ method: 'post', url: '/texture' })
    const form = call?.body as FormData
    expect(form.get('name')).toBe('Hero')
    expect(form.get('type')).toBe('alex')
    expect(form.get('public')).toBe('0')
    expect((form.get('file') as File).name).toBe('skin.png')
  })
})
