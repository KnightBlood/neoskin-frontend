import { describe, expect, it } from 'vitest'
import { validatePlayerName } from './player'

describe('player name validation', () => {
  it('accepts official names and rejects symbols', () => {
    expect(validatePlayerName('Steve_01', { rule: 'official' })).toBeNull()
    expect(validatePlayerName('Steve!', { rule: 'official' })).toBe('charset')
  })

  it('enforces the default length range', () => {
    expect(validatePlayerName('ab', { rule: 'official' })).toBe('length')
    expect(validatePlayerName('a'.repeat(17), { rule: 'official' })).toBe('length')
  })

  it('rejects empty names', () => {
    expect(validatePlayerName('   ')).toBe('empty')
  })

  it('accepts CJK characters under the cjk rule', () => {
    expect(validatePlayerName('史蒂夫', { rule: 'cjk' })).toBeNull()
    expect(validatePlayerName('スティーブ', { rule: 'cjk' })).toBeNull()
    expect(validatePlayerName('Steve!', { rule: 'cjk' })).toBe('charset')
  })

  it('uses a custom regular expression when configured', () => {
    expect(validatePlayerName('abc123', { rule: 'custom', regexp: '^[a-z0-9]+$' })).toBeNull()
    expect(validatePlayerName('ABC', { rule: 'custom', regexp: '^[a-z0-9]+$' })).toBe('regexp')
    expect(validatePlayerName('ABC', { rule: 'custom', regexp: '[' })).toBeNull()
  })

  it('accepts any UTF-8 name under the utf8 rule', () => {
    expect(validatePlayerName('玩家 one', { rule: 'utf8' })).toBeNull()
  })
})
