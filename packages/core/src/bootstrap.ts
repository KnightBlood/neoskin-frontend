import {
  assertBootstrap,
  parseBootstrap,
  type BootstrapPayload,
} from '@neoskin/contract'

export const BOOTSTRAP_ELEMENT_ID = 'neoskin-bootstrap'
export const BOOTSTRAP_FALLBACK_URL = '/api/bootstrap'

export interface ReadBootstrapOptions {
  fallbackUrl?: string
  fetchImpl?: typeof fetch
  documentImpl?: Document
}

/** 从 SPA 壳读取 #neoskin-bootstrap（不存在返回 null）。 */
export function readBootstrapFromDom(
  documentImpl: Document = document,
): BootstrapPayload | null {
  const element = documentImpl.getElementById(BOOTSTRAP_ELEMENT_ID)
  const raw = element?.textContent?.trim()
  if (!raw) {
    return null
  }
  return parseBootstrap(raw)
}

/**
 * 读取 bootstrap：壳内联优先，缺失时回退 GET /api/bootstrap。
 * 返回的 payload 已通过契约校验（版本不符抛 ContractError）。
 */
export async function readBootstrap(
  options: ReadBootstrapOptions = {},
): Promise<BootstrapPayload> {
  const embedded = readBootstrapFromDom(options.documentImpl)
  if (embedded) {
    return embedded
  }
  const fetchImpl = options.fetchImpl ?? fetch
  const url = options.fallbackUrl ?? BOOTSTRAP_FALLBACK_URL
  const response = await fetchImpl(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`读取 bootstrap 失败：HTTP ${response.status}`)
  }
  const body = (await response.json()) as { code?: number; data?: unknown }
  if (typeof body.code === 'number' && 'data' in body) {
    if (body.code !== 0) {
      throw new Error(`读取 bootstrap 失败：code ${body.code}`)
    }
    return assertBootstrap(body.data)
  }
  return assertBootstrap(body)
}

/** CSRF token：meta 优先（壳注入），其次 bootstrap。 */
export function readCsrfToken(
  payload: Pick<BootstrapPayload, 'csrfToken'>,
  documentImpl: Document = document,
): string {
  const meta = documentImpl
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content')
  return meta || payload.csrfToken
}
