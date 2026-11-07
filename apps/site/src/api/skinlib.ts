import type { HttpClient } from '@neoskin/core'

/** 与 PHP `TextureType` 一致。 */
export type TextureType = 'steve' | 'alex' | 'cape'

/** 皮肤库筛选：`skin` 表示任意模型。 */
export type SkinFilter = 'skin' | TextureType

export type LibrarySort = 'time' | 'likes'

/** `GET /skinlib/list` 的单项。 */
export interface LibraryItem {
  tid: number
  name: string
  type: TextureType
  uploader: number
  public: boolean
  likes: number
  nickname: string
}

/** Laravel `paginate()` 结构（只取前端需要的字段）。 */
export interface Paginator<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

/** `GET /skinlib/info/{tid}`、`GET /texture/{tid}`。 */
export interface Texture {
  tid: number
  name: string
  type: TextureType
  hash: string
  size: number
  uploader: number
  public: boolean
  upload_at: string
  likes: number
  model?: string
}

/** PHP `json()` 业务响应。 */
export interface BusinessResponse<T = undefined> {
  code: number
  message: string
  data?: T
}

export interface LibraryQuery {
  filter?: SkinFilter
  keyword?: string
  sort?: LibrarySort
  uploader?: number
  page?: number
}

export interface UploadInput {
  name: string
  type: TextureType
  file: File
  isPublic: boolean
}

export const TEXTURE_TYPES: TextureType[] = ['steve', 'alex', 'cape']

export function normalizeFilter(value: string | null | undefined): SkinFilter {
  return value === 'steve' || value === 'alex' || value === 'cape' ? value : 'skin'
}

export function normalizeSort(value: string | null | undefined): LibrarySort {
  return value === 'likes' ? 'likes' : 'time'
}

/** 读取分页页码，非法值回退到 1。 */
export function normalizePage(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

/** 读取上传者 UID，0 表示全部用户。 */
export function normalizeUploader(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** 构造皮肤库查询参数；空值不发送，保持与 PHP 版一致。 */
export function buildLibraryParams(query: LibraryQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    filter: query.filter ?? 'skin',
    sort: query.sort ?? 'time',
    page: query.page && query.page > 0 ? query.page : 1,
  }
  if (query.keyword) {
    params.keyword = query.keyword
  }
  if (query.uploader && query.uploader > 0) {
    params.uploader = query.uploader
  }
  return params
}

export function fetchLibrary(
  http: HttpClient,
  query: LibraryQuery,
): Promise<Paginator<LibraryItem>> {
  return http.get<Paginator<LibraryItem>>('/skinlib/list', {
    params: buildLibraryParams(query),
  })
}

export function fetchTexture(http: HttpClient, tid: number): Promise<Texture> {
  return http.get<Texture>(`/skinlib/info/${tid}`)
}

export function fetchClosetIds(http: HttpClient): Promise<number[]> {
  return http.get<number[]>('/user/closet/ids')
}

export function addToCloset(
  http: HttpClient,
  tid: number,
  name: string,
): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/user/closet', { tid, name })
}

export function removeFromCloset(
  http: HttpClient,
  tid: number,
): Promise<BusinessResponse> {
  return http.delete<BusinessResponse>(`/user/closet/${tid}`)
}

export function reportTexture(
  http: HttpClient,
  tid: number,
  reason: string,
): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/skinlib/report', { tid, reason })
}

export function uploadTexture(
  http: HttpClient,
  input: UploadInput,
): Promise<BusinessResponse<{ tid: number }>> {
  const form = new FormData()
  form.append('name', input.name)
  form.append('type', input.type)
  form.append('file', input.file, input.file.name)
  form.append('public', input.isPublic ? '1' : '0')
  return http.post<BusinessResponse<{ tid: number }>>('/texture', form)
}

export function renameTexture(
  http: HttpClient,
  tid: number,
  name: string,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/texture/${tid}/name`, { name })
}

export function setTextureType(
  http: HttpClient,
  tid: number,
  type: TextureType,
): Promise<BusinessResponse> {
  return http.put<BusinessResponse>(`/texture/${tid}/type`, { type })
}

export function setTexturePrivacy(
  http: HttpClient,
  tid: number,
): Promise<BusinessResponse<{ tid: number }>> {
  return http.put<BusinessResponse<{ tid: number }>>(`/texture/${tid}/privacy`)
}

export function deleteTexture(
  http: HttpClient,
  tid: number,
): Promise<BusinessResponse> {
  return http.delete<BusinessResponse>(`/texture/${tid}`)
}

export function setAvatar(http: HttpClient, tid: number): Promise<BusinessResponse> {
  return http.post<BusinessResponse>('/user/profile/avatar', { tid })
}
