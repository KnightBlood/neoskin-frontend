import { createInstance, type i18n as I18nInstance } from 'i18next'
import { isRecord, type BootstrapPayload } from '@neoskin/contract'

export type LocaleResources = Record<string, unknown>

export interface LoadLocaleOptions {
  /** 默认 /lang/{locale}.js（相对同源）。 */
  url?: string
  fetchImpl?: typeof fetch
}

/**
 * 解析 `/lang/{locale}.js`：`blessing.i18n = {...}`。
 * 兼容 `window.blessing.i18n = {...};` 与尾部分号。
 */
export function parseLanguageScript(source: string): LocaleResources {
  const index = source.indexOf('=')
  if (index < 0) {
    throw new Error('语言包格式不正确：缺少赋值符号')
  }
  let json = source.slice(index + 1).trim()
  if (json.endsWith(';')) {
    json = json.slice(0, -1).trim()
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(json)
  } catch (error) {
    throw new Error(`语言包 JSON 解析失败：${(error as Error).message}`)
  }
  if (!isRecord(decoded)) {
    throw new Error('语言包必须是 JSON 对象')
  }
  return decoded
}

export async function loadLocale(
  locale: string,
  options: LoadLocaleOptions = {},
): Promise<LocaleResources> {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = options.url ?? `/lang/${locale}.js`
  const response = await fetchImpl(url, {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`读取语言包失败：${locale} HTTP ${response.status}`)
  }
  return parseLanguageScript(await response.text())
}

export interface InitI18nOptions {
  fetchImpl?: typeof fetch
}

/**
 * 初始化 i18next：加载当前语言与回退语言，语言键与 PHP `front-end.yml` 一致。
 * 后端 language_lines 覆盖已合并进 /lang/{locale}.js。
 */
export async function initI18n(
  bootstrap: Pick<BootstrapPayload, 'locale' | 'localeFallback'>,
  options: InitI18nOptions = {},
): Promise<I18nInstance> {
  const instance = createInstance()
  const { locale, localeFallback } = bootstrap
  const [primary, fallback] = await Promise.all([
    loadLocale(locale, options),
    locale === localeFallback
      ? Promise.resolve<LocaleResources>({})
      : loadLocale(localeFallback, options).catch(() => ({})),
  ])
  await instance.init({
    lng: locale,
    fallbackLng: localeFallback,
    resources: {
      [locale]: { translation: primary },
      [localeFallback]: { translation: fallback },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  return instance
}
