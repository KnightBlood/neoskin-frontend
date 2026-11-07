import type { TFunction } from 'i18next'

/**
 * Blessing Skin 的语言包使用 PHP 风格占位符（`:score`、`:name`），
 * i18next 只识别 `{{name}}`，因此这里按最长键优先替换。
 */
export function interpolateParams(
  template: string,
  params: Record<string, string | number>,
): string {
  let result = template
  const keys = Object.keys(params).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    result = result.split(`:${key}`).join(String(params[key]))
  }
  return result
}

/** 读取译文并替换 PHP 风格占位符；缺失时使用 `fallback`。 */
export function tWithParams(
  t: TFunction,
  key: string,
  params: Record<string, string | number>,
  fallback?: string,
): string {
  const raw = t(key, { defaultValue: fallback ?? key })
  return interpolateParams(String(raw), params)
}
