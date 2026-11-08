import { describe, expect, it } from 'vitest'
import { initI18n } from '@neoskin/core'
import { interpolateParams } from './i18n'

describe('i18n helpers', () => {
  it('keeps translations when locale equals fallback locale', async () => {
    const script = 'blessing.i18n = {"general":{"skinlib":"Skin Library"}}'
    const i18n = await initI18n(
      { locale: 'en', localeFallback: 'en' },
      {
        fetchImpl: (async () => ({
          ok: true,
          status: 200,
          text: async () => script,
        })) as unknown as typeof fetch,
      },
    )

    expect(i18n.t('general.skinlib')).toBe('Skin Library')
  })

  it('replaces PHP-style placeholders', () => {
    expect(interpolateParams(':time :unit 后可签到', { time: 3, unit: '小时' })).toBe(
      '3 小时 后可签到',
    )
  })

  it('replaces longer keys first so :score-from wins over :score', () => {
    expect(
      interpolateParams(':score-from ~ :score-to（:score）', {
        score: 10,
        'score-from': 1,
        'score-to': 100,
      }),
    ).toBe('1 ~ 100（10）')
  })

  it('keeps unknown placeholders untouched', () => {
    expect(interpolateParams('你好 :name', {})).toBe('你好 :name')
  })
})
