import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ValidationErrorResponse } from '@neoskin/contract'

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export interface HttpClientOptions {
  /** 空串 = 同源；跨域时传绝对 URL（不带尾斜杠）。 */
  baseURL?: string
  csrfToken?: string
  timeoutMs?: number
  onUnauthenticated?: (error: AxiosError) => void
  onCsrfExpired?: (error: AxiosError) => void
  onForbidden?: (error: AxiosError) => void
}

export interface NormalizedApiError {
  status?: number
  message: string
  errors?: Record<string, string[]>
  cause?: unknown
}

export interface HttpClient {
  readonly raw: AxiosInstance
  setCsrfToken(token: string): void
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
}

function sendCsrf(config: InternalAxiosRequestConfig): boolean {
  const method = (config.method ?? 'get').toLowerCase()
  return WRITE_METHODS.has(method)
}

/**
 * 两个 app 唯一的网络入口：
 * - 同源 Cookie（withCredentials）
 * - 写请求自动带 X-CSRF-TOKEN
 * - 401/419/403 统一回调（由 app 决定跳转/刷新）
 */
export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  let csrfToken = options.csrfToken ?? ''
  const client = axios.create({
    baseURL: options.baseURL || '',
    withCredentials: true,
    timeout: options.timeoutMs ?? 30_000,
    headers: { Accept: 'application/json' },
  })

  client.interceptors.request.use((config) => {
    if (csrfToken && sendCsrf(config)) {
      config.headers.set('X-CSRF-TOKEN', csrfToken)
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status
      if (status === 401) {
        options.onUnauthenticated?.(error)
      } else if (status === 419) {
        options.onCsrfExpired?.(error)
      } else if (status === 403) {
        options.onForbidden?.(error)
      }
      return Promise.reject(error)
    },
  )

  const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
    const response = await client.request<T>(config)
    return response.data
  }

  return {
    raw: client,
    setCsrfToken(token: string) {
      csrfToken = token
    },
    get: <T>(url: string, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'get', url }),
    post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'post', url, data }),
    put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'put', url, data }),
    delete: <T>(url: string, config?: AxiosRequestConfig) =>
      request<T>({ ...config, method: 'delete', url }),
  }
}

/** 把 Axios 异常归一化为可展示的消息（422 保留字段错误）。 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const body = error.response?.data as
      | Partial<ValidationErrorResponse>
      | { message?: string }
      | undefined
    return {
      status,
      message: body?.message ?? error.message ?? '请求失败',
      errors: (body as ValidationErrorResponse | undefined)?.errors,
      cause: error,
    }
  }
  if (error instanceof Error) {
    return { message: error.message, cause: error }
  }
  return { message: String(error), cause: error }
}
