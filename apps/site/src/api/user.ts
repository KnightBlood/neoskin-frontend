import type { HttpClient } from '@neoskin/core'
import type { BusinessResponse, Paginator, TextureType } from './skinlib'

/** `GET /user/score-info`（PHP `UserController@scoreInfo`）。 */
export interface ScoreInfo {
  user: {
    score: number
    lastSignAt: string
  }
  rate: {
    storage: number
    players: number
  }
  usage: {
    players: number
    storage: number
  }
  signAfterZero: boolean
  signGapTime: number
}

/** `GET /user/player/list` 的单条角色。 */
export interface PlayerRow {
  pid: number
  uid: number
  name: string
  tid_skin: number
  tid_cape: number
  last_modified?: string
}

/** 衣柜条目 = 材质字段 + `pivot.item_name`。 */
export interface ClosetItem {
  tid: number
  name: string
  type: TextureType
  hash: string
  size: number
  uploader: number
  public: boolean
  upload_at: string
  likes: number
  pivot: {
    user_uid: number
    texture_tid: number
    item_name: string
  }
}

/** Passport 客户端（`GET /oauth/clients`）。 */
export interface OAuthClient {
  id: number
  name: string
  redirect: string
  secret?: string
  /** Passport 13 只在创建成功时返回一次明文密钥。 */
  plain_secret?: string
  personal_access_client?: boolean
  password_client?: boolean
  revoked?: boolean
}

/** `GET /api/user/inbox` 的单条站内信。 */
export interface InboxItem {
  id: number | string
  title: string
  /** 纯文本预览（HTML 已剥离，最多 120 字）。 */
  preview?: string
  format?: string
  read_at: string | null
  created_at: string
  communication_id?: number
}

export interface InboxMessage {
  id: number | string
  title: string
  content: string
  format?: string | null
  read_at: string | null
  created_at: string
  communication_id?: number
}

export interface InboxPage extends Paginator<InboxItem> {
  unread?: number
}

/** `GET /api/user/reports` 的单条举报记录。 */
export interface ReportItem {
  id?: number
  tid: number
  texture_name?: string
  reason: string
  status: number
  report_at: string
}

export type ProfileAction = 'nickname' | 'password' | 'email' | 'delete'

export function fetchScoreInfo(http: HttpClient): Promise<ScoreInfo> {
  return http.get<ScoreInfo>('/user/score-info')
}

export function signIn(http: HttpClient): Promise<BusinessResponse<{ score: number }>> {
  return http.post<BusinessResponse<{ score: number }>>('/user/sign')
}

export function updateProfile(
  http: HttpClient,
  action: ProfileAction,
  payload: Record<string, unknown>,
): Promise<BusinessResponse> {
  return http.post<BusinessResponse>(`/user/profile?action=${action}`, payload)
}

export function resetAvatar(http: HttpClient): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/user/profile/avatar', { tid: 0 })
}

export function sendVerificationEmail(http: HttpClient): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/user/email-verification')
}

export function fetchPlayers(http: HttpClient): Promise<PlayerRow[]> {
  return http.get<PlayerRow[]>('/user/player/list')
}

export function addPlayer(
  http: HttpClient,
  name: string,
): Promise<BusinessResponse<PlayerRow>> {
  return http.post<BusinessResponse<PlayerRow>>('/user/player', { name })
}

export function renamePlayer(
  http: HttpClient,
  pid: number,
  name: string,
): Promise<BusinessResponse<PlayerRow>> {
  return http.put<BusinessResponse<PlayerRow>>(`/user/player/${pid}/name`, { name })
}

export function deletePlayer(http: HttpClient, pid: number): Promise<BusinessResponse> {
  return http.delete<BusinessResponse>(`/user/player/${pid}`)
}

export interface PlayerTexturePatch {
  skin?: number
  cape?: number
}

export function setPlayerTextures(
  http: HttpClient,
  pid: number,
  patch: PlayerTexturePatch,
): Promise<BusinessResponse<PlayerRow>> {
  return http.put<BusinessResponse<PlayerRow>>(`/user/player/${pid}/textures`, patch)
}

/** PHP 用查询串标记要清除的材质类型（兼容旧版 Ajax）。 */
export function clearPlayerTextures(
  http: HttpClient,
  pid: number,
  types: Array<'skin' | 'cape'>,
): Promise<BusinessResponse> {
  const params: Record<string, string> = {}
  for (const type of types) {
    params[type] = 'true'
  }
  return http.delete<BusinessResponse>(`/user/player/${pid}/textures`, { params })
}

export interface ClosetQuery {
  category?: 'skin' | 'cape'
  q?: string
  page?: number
  perPage?: number
}

export function fetchCloset(
  http: HttpClient,
  query: ClosetQuery,
): Promise<Paginator<ClosetItem>> {
  return http.get<Paginator<ClosetItem>>('/user/closet/list', {
    params: {
      category: query.category ?? 'skin',
      q: query.q || undefined,
      page: query.page && query.page > 0 ? query.page : 1,
      perPage: query.perPage && query.perPage > 0 ? query.perPage : 6,
    },
  })
}

export function renameClosetItem(
  http: HttpClient,
  tid: number,
  name: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/user/closet/${tid}`, { name })
}

export function fetchInbox(http: HttpClient, page: number): Promise<InboxPage> {
  return http
    .get<InboxPage>('/api/user/inbox', { params: { page, per_page: 10 } })
    .then((body) => {
      if (!isPaginatorLike(body)) {
        throw new EndpointUnavailableError('GET /api/user/inbox')
      }
      return body as InboxPage
    })
}

export function fetchInboxMessage(http: HttpClient, id: string): Promise<InboxMessage> {
  return http
    .get<{ code?: number; data?: InboxMessage } | InboxMessage>(
      `/api/user/inbox/${encodeURIComponent(id)}`,
    )
    .then((body) => {
      const payload =
        body && typeof body === 'object' && 'data' in body && body.data ? body.data : body
      if (
        !payload ||
        typeof payload !== 'object' ||
        typeof (payload as InboxMessage).content !== 'string'
      ) {
        throw new EndpointUnavailableError(`GET /api/user/inbox/${id}`)
      }
      return payload as InboxMessage
    })
}

export function fetchReports(
  http: HttpClient,
  page: number,
): Promise<Paginator<ReportItem>> {
  return http
    .get<Paginator<ReportItem>>('/api/user/reports', { params: { page, per_page: 10 } })
    .then((body) => {
      if (!isPaginatorLike(body)) {
        throw new EndpointUnavailableError('GET /api/user/reports')
      }
      return body as Paginator<ReportItem>
    })
}

/** 后端尚未实现某契约端点（返回 HTML 或空响应时抛出）。 */
export class EndpointUnavailableError extends Error {
  constructor(public readonly endpoint: string) {
    super(`后端尚未实现 ${endpoint}`)
    this.name = 'EndpointUnavailableError'
  }
}

export function isPaginatorLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Record<string, unknown>
  return Array.isArray(record.data) && typeof record.last_page === 'number'
}

export function fetchOAuthClients(http: HttpClient): Promise<OAuthClient[]> {
  return http.get<OAuthClient[]>('/oauth/clients')
}

export function createOAuthClient(
  http: HttpClient,
  input: { name: string; redirect: string },
): Promise<OAuthClient> {
  return http.post<OAuthClient>('/oauth/clients', input)
}

export function updateOAuthClient(
  http: HttpClient,
  id: number,
  input: { name: string; redirect: string },
): Promise<OAuthClient> {
  return http.put<OAuthClient>(`/oauth/clients/${id}`, input)
}

export function deleteOAuthClient(http: HttpClient, id: number): Promise<void> {
  return http.delete<void>(`/oauth/clients/${id}`)
}

/** 站内信标题；缺失时使用通用文案。 */
export function inboxTitle(item: { title?: string }): string {
  return item.title || '站内信'
}
