import { describe, expect, it } from 'vitest'
import { interpolateParams } from './i18n'

describe('i18n helpers', () => {
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
