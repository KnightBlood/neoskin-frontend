import type { HttpClient } from '@neoskin/core'
import type { Paginated } from '@neoskin/contract'

/** `GET /api/admin/dashboard`。 */
export interface AdminStats {
  users: number
  players: number
  textures: number
  storage: number
  storageHuman: string
}

/** `GET /admin/chart`（最近 31 天注册/上传）。 */
export interface ChartPayload {
  labels: string[]
  xAxis: string[]
  data: number[][]
}

/** `GET /admin/users/list` 的单条。 */
export interface AdminUser {
  uid: number
  email: string
  nickname: string
  locale?: string
  score: number
  avatar: number
  ip?: string
  is_dark_mode?: boolean
  permission: number
  last_sign_at?: string
  register_at?: string
  verified: boolean
  verification_token?: string
}

/** `GET /admin/players/list` 的单条。 */
export interface AdminPlayer {
  pid: number
  uid: number
  name: string
  tid_skin: number
  tid_cape: number
  last_modified?: string
}

/** `GET /admin/reports/list` 的单条。 */
export interface AdminReport {
  id: number
  tid: number
  uploader: number
  reporter: number
  reason: string
  status: number
  report_at: string
  texture?: { tid: number; name: string; type: string } | null
  texture_uploader?: { uid: number; nickname: string } | null
  informer?: { uid: number; nickname: string } | null
}

/** `GET /admin/status`。 */
export interface AdminStatus {
  bs: Record<string, string>
  server: Record<string, string>
  db: Record<string, string>
  plugins?: unknown[]
}

/** `GET /admin/i18n/list` 的单条。 */
export interface LanguageLine {
  id: number
  group: string
  key: string
  text: Record<string, string>
  created_at?: string
  updated_at?: string
}

/** `GET /admin/plugins/data` 的单条。 */
export interface AdminPlugin {
  name: string
  title: string
  description: string
  version: string
  enabled: boolean
  readme: boolean
  config: boolean
  icon?: Record<string, string>
}

/** `GET /admin/plugins/market/list` 的单条。 */
export interface MarketPlugin {
  name: string
  title: string
  description: string
  version: string
  dist: { url: string }
  dependencies?: { all?: string[]; unsatisfied?: string[] }
  installed: boolean | string
  can_update: boolean
}

export interface BusinessResponse<T = undefined> {
  code: number
  message: string
  data?: T
}

export function fetchDashboard(http: HttpClient): Promise<AdminStats> {
  return http.get<AdminStats>('/api/admin/dashboard')
}

export function fetchChart(http: HttpClient): Promise<ChartPayload> {
  return http.get<ChartPayload>('/admin/chart')
}

export function fetchUsers(
  http: HttpClient,
  query: { q?: string; page?: number },
): Promise<Paginated<AdminUser>> {
  return http.get<Paginated<AdminUser>>('/admin/users/list', {
    params: { q: query.q || undefined, page: query.page ?? 1 },
  })
}

export function updateUserEmail(
  http: HttpClient,
  uid: number,
  email: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/users/${uid}/email`, { email })
}

export function updateUserNickname(
  http: HttpClient,
  uid: number,
  nickname: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/users/${uid}/nickname`, { nickname })
}

export function updateUserPassword(
  http: HttpClient,
  uid: number,
  password: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/users/${uid}/password`, { password })
}

export function updateUserScore(
  http: HttpClient,
  uid: number,
  score: number,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/users/${uid}/score`, { score })
}

export function updateUserPermission(
  http: HttpClient,
  uid: number,
  permission: number,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/users/${uid}/permission`, { permission })
}

export function toggleUserVerification(
  http: HttpClient,
  uid: number,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/users/${uid}/verification`)
}

export function deleteUser(http: HttpClient, uid: number): Promise<BusinessResponse> {
  return http.delete<BusinessResponse>(`/admin/users/${uid}`)
}

export function fetchPlayers(
  http: HttpClient,
  query: { q?: string; page?: number },
): Promise<Paginated<AdminPlayer>> {
  return http.get<Paginated<AdminPlayer>>('/admin/players/list', {
    params: { q: query.q || undefined, page: query.page ?? 1 },
  })
}

export function updatePlayerName(
  http: HttpClient,
  pid: number,
  name: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/players/${pid}/name`, { player_name: name })
}

export function updatePlayerOwner(
  http: HttpClient,
  pid: number,
  uid: number,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/players/${pid}/owner`, { uid })
}

export function updatePlayerTexture(
  http: HttpClient,
  pid: number,
  type: 'skin' | 'cape',
  tid: number,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/players/${pid}/textures`, { tid, type })
}

export function deletePlayer(http: HttpClient, pid: number): Promise<BusinessResponse> {
  return http.delete<BusinessResponse>(`/admin/players/${pid}`)
}

export function fetchReports(
  http: HttpClient,
  query: { q?: string; page?: number },
): Promise<Paginated<AdminReport>> {
  return http.get<Paginated<AdminReport>>('/admin/reports/list', {
    params: { q: query.q || undefined, page: query.page ?? 1 },
  })
}

export type ReportAction = 'delete' | 'ban' | 'reject'

export function reviewReport(
  http: HttpClient,
  id: number,
  action: ReportAction,
): Promise<BusinessResponse<{ status: number }>> {
  return http.put<BusinessResponse<{ status: number }>>(`/admin/reports/${id}`, { action })
}

export function fetchStatus(http: HttpClient): Promise<AdminStatus> {
  return http.get<AdminStatus>('/admin/status')
}

export function fetchLanguageLines(
  http: HttpClient,
  page: number,
): Promise<Paginated<LanguageLine>> {
  return http.get<Paginated<LanguageLine>>('/admin/i18n/list', { params: { page } })
}

export function createLanguageLine(
  http: HttpClient,
  input: { group: string; key: string; lang: string; text: string },
): Promise<unknown> {
  return http.post<unknown>('/admin/i18n', input)
}

export function updateLanguageLine(
  http: HttpClient,
  id: number,
  lang: string,
  text: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/admin/i18n/${id}`, { lang, text })
}

export function deleteLanguageLine(http: HttpClient, id: number): Promise<unknown> {
  return http.delete<unknown>(`/admin/i18n/${id}`)
}

export function fetchPlugins(http: HttpClient): Promise<AdminPlugin[]> {
  return http.get<AdminPlugin[]>('/admin/plugins/data')
}

export type PluginAction = 'enable' | 'disable' | 'delete'

export function managePlugin(
  http: HttpClient,
  name: string,
  action: PluginAction,
): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/admin/plugins/manage', { name, action })
}

export function uploadPlugin(http: HttpClient, file: File): Promise<BusinessResponse> {
  const form = new FormData()
  form.append('file', file, file.name)
  return http.post<BusinessResponse>('/admin/plugins/upload', form)
}

export function installPluginByUrl(
  http: HttpClient,
  url: string,
): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/admin/plugins/wget', { url })
}

export function fetchMarket(http: HttpClient): Promise<MarketPlugin[] | BusinessResponse> {
  return http.get<MarketPlugin[] | BusinessResponse>('/admin/plugins/market/list')
}

export function downloadMarketPlugin(
  http: HttpClient,
  name: string,
): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/admin/plugins/market/download', { name })
}

export const PERMISSION_LABELS: Record<number, string> = {
  [-1]: '封禁',
  0: '普通用户',
  1: '管理员',
  2: '超级管理员',
}

export function permissionLabel(permission: number): string {
  return PERMISSION_LABELS[permission] ?? String(permission)
}

export const REPORT_STATUS_LABELS = ['待处理', '已解决', '已拒绝']

export function reportStatusLabel(status: number): string {
  return REPORT_STATUS_LABELS[status] ?? String(status)
}
