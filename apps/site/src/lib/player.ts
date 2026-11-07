export type PlayerNameRule = 'official' | 'cjk' | 'utf8' | 'custom'

export interface PlayerNameOptions {
  rule?: string
  regexp?: string
  min?: number
  max?: number
}

export type PlayerNameError = 'empty' | 'length' | 'charset' | 'regexp'

export const DEFAULT_PLAYER_NAME_MIN = 3
export const DEFAULT_PLAYER_NAME_MAX = 16

/**
 * 与 PHP `Rules\PlayerName` 对齐的本地预校验（服务端仍会再次校验）。
 * 返回错误类型，由调用方决定展示文案。
 */
export function validatePlayerName(
  name: string,
  options: PlayerNameOptions = {},
): PlayerNameError | null {
  const value = name.trim()
  if (!value) {
    return 'empty'
  }

  const min = options.min && options.min > 0 ? options.min : DEFAULT_PLAYER_NAME_MIN
  const max = options.max && options.max > 0 ? options.max : DEFAULT_PLAYER_NAME_MAX
  if (value.length < min || value.length > max) {
    return 'length'
  }

  switch (normalizeRule(options.rule)) {
    case 'official':
      return /^[A-Za-z0-9_]+$/.test(value) ? null : 'charset'
    case 'cjk':
      return /^[A-Za-z0-9_\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+$/.test(value)
        ? null
        : 'charset'
    case 'custom':
      if (!options.regexp) {
        return null
      }
      try {
        return new RegExp(options.regexp, 'u').test(value) ? null : 'regexp'
      } catch {
        return null
      }
    case 'utf8':
    default:
      return null
  }
}

function normalizeRule(rule: string | undefined): PlayerNameRule {
  return rule === 'cjk' || rule === 'utf8' || rule === 'custom' ? rule : 'official'
}
