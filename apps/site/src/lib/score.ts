const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE
const ONE_DAY = 24 * ONE_HOUR

/**
 * 解析后端 `last_sign_at`（`Y-m-d H:i:s`，可能为空 / 零值）。
 * 无法解析时返回 0，等价于「从未签到」。
 */
export function parseSignTime(value: string | null | undefined): number {
  if (!value) {
    return 0
  }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * 距离下次可签到的毫秒数，与 PHP `resources/assets/src/views/user/Dashboard/scoreUtils.ts` 一致：
 * - `sign_after_zero`：当天 0 点后即可再次签到；
 * - 否则：距离上次签到满 `sign_gap_time` 小时。
 */
export function remainingSignMs(
  lastSignAt: string | null | undefined,
  signGapTime: number,
  signAfterZero: boolean,
  now: number = Date.now(),
): number {
  const last = parseSignTime(lastSignAt)
  if (!last) {
    return 0
  }
  if (signAfterZero) {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()
    if (last < todayStart) {
      return 0
    }
    return Math.max(0, todayStart + ONE_DAY - now)
  }
  const hours = Number.isFinite(signGapTime) && signGapTime > 0 ? signGapTime : 24
  return Math.max(0, last + hours * ONE_HOUR - now)
}

export interface RemainingParts {
  value: number
  unit: 'minute' | 'hour'
}

/** 把剩余毫秒拆成「分钟」或「小时」，供 i18n 拼接。 */
export function remainingParts(ms: number): RemainingParts {
  const minutes = Math.max(0, ms) / ONE_MINUTE
  if (minutes < 60) {
    return { value: Math.floor(minutes), unit: 'minute' }
  }
  return { value: Math.floor(minutes / 60), unit: 'hour' }
}

/** 积分消耗/返还的展示文案：`消耗 N 积分 / 返还 N 积分`。 */
export function formatScoreDelta(delta: number): string {
  if (delta < 0) {
    return `消耗 ${Math.abs(delta)} 积分`
  }
  if (delta > 0) {
    return `返还 ${delta} 积分`
  }
  return ''
}
