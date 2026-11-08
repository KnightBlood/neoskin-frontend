/**
 * 契约 v1 类型（与 docs/BACKEND-CONTRACT.md 保持一致）。
 * 只允许向后兼容地加字段；破坏性变更必须升 CONTRACT_VERSION。
 */
export const CONTRACT_VERSION = 1 as const

export type ContractVersion = typeof CONTRACT_VERSION
export type FrontendMode = 'site' | 'admin'

export interface BootstrapUser {
  uid: number
  email: string
  nickname: string
  /** 站点绝对路径（如 /avatar/1），前端不再拼接 basePath。 */
  avatar: string
  score: number
  permission: number
  verified: boolean
  isAdmin: boolean
  isBanned: boolean
  darkMode: boolean
}

export interface BootstrapOptions {
  site_name?: string
  site_description?: string
  user_can_register?: boolean
  captcha?: boolean
  max_upload_file_size?: number
  max_texture_width?: number
  score_per_storage?: number
  private_score_per_storage?: number
  score_award_per_texture?: number
  score_per_player?: number
  score_per_closet_item?: number
  sign_score?: string
  player_name_length_min?: number
  player_name_length_max?: number
  user_initial_score?: number
  allow_downloading_texture?: boolean
  require_verification?: boolean
  reporter_score_modification?: number
  reporter_reward_score?: number
  return_score?: boolean
  sign_after_zero?: boolean
  sign_gap_time?: number
  take_back_scores_after_deletion?: boolean
  player_name_rule?: string
  custom_player_name_regexp?: string
  register_with_player_name?: boolean
  navbar_color?: string
  sidebar_color?: string
  copyright_prefer?: string
  copyright_text?: string
  recaptcha?: boolean
  recaptcha_site_key?: string
  update_source?: string
  plugin_market_source?: string
  /** 未知键原样透传。 */
  [key: string]: unknown
}

export interface BootstrapFeatures {
  registration: boolean
  emailVerification: boolean
  passwordReset: boolean
  oauth: boolean
  reports: boolean
  plugins: boolean
}

export interface PluginMenu {
  area: 'user' | 'admin' | 'explore'
  title: string
  url: string
  icon?: string
  order?: number
}

export type BadgeTone = 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary'

export interface PluginBadge {
  text: string
  tone?: BadgeTone
}

export interface PluginInjection {
  menus: PluginMenu[]
  badges: PluginBadge[]
  styles: string[]
  scripts: string[]
}

export interface BootstrapPayload {
  contractVersion: number
  /** 空串 = 同源；否则绝对 URL（不带尾斜杠）。 */
  apiBase: string
  locale: string
  localeFallback: string
  siteName: string
  version: string
  /** 静态资源前缀，以 / 结尾。 */
  basePath: string
  mode: FrontendMode
  /** 可选：站点支持的语言列表（如 ["zh_CN", "en"]）。 */
  locales?: string[]
  csrfToken: string
  user: BootstrapUser | null
  options: BootstrapOptions
  features: BootstrapFeatures
  plugins: PluginInjection
}

/** PHP json() 的业务响应结构。 */
export interface ApiEnvelope<T = unknown> {
  code: number
  message: string
  data?: T
}

export interface ValidationErrorResponse {
  message: string
  errors: Record<string, string[]>
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface MessageResponse {
  message: string
}

export interface LoginResult {
  redirectTo: string
  uid: number
}
