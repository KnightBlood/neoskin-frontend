import { describe, expect, it } from 'vitest'
import { formatScoreDelta, parseSignTime, remainingParts, remainingSignMs } from './score'

const HOUR = 60 * 60 * 1000

describe('score helpers', () => {
  it('parses SQL timestamps and rejects empty values', () => {
    expect(parseSignTime('2026-11-07 10:00:00')).toBeGreaterThan(0)
    expect(parseSignTime('')).toBe(0)
    expect(parseSignTime(null)).toBe(0)
    expect(parseSignTime('not-a-date')).toBe(0)
  })

  it('requires a full gap between sign-ins', () => {
    const now = new Date('2026-11-07T11:00:00').getTime()
    const remaining = remainingSignMs('2026-11-07 10:00:00', 24, false, now)
    expect(remaining).toBe(23 * HOUR)
  })

  it('allows signing after midnight when sign_after_zero is on', () => {
    const now = new Date('2026-11-07T09:00:00').getTime()
    expect(remainingSignMs('2026-11-06 20:00:00', 24, true, now)).toBe(0)
    expect(remainingSignMs('2026-11-07 00:30:00', 24, true, now)).toBe(15 * HOUR)
  })

  it('never returns negative time', () => {
    const now = new Date('2026-11-09T00:00:00').getTime()
    expect(remainingSignMs('2026-11-07 10:00:00', 24, false, now)).toBe(0)
  })

  it('splits remaining time into minutes or hours', () => {
    expect(remainingParts(30 * 60 * 1000)).toEqual({ value: 30, unit: 'minute' })
    expect(remainingParts(2.5 * HOUR)).toEqual({ value: 2, unit: 'hour' })
  })

  it('formats score deltas', () => {
    expect(formatScoreDelta(-100)).toBe('消耗 100 积分')
    expect(formatScoreDelta(30)).toBe('返还 30 积分')
    expect(formatScoreDelta(0)).toBe('')
  })
})
