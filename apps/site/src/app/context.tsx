import { createContext, useContext } from 'react'
import type { BootstrapPayload, BootstrapUser } from '@neoskin/contract'
import type { HttpClient } from '@neoskin/core'

export interface AppContextValue {
  bootstrap: BootstrapPayload
  http: HttpClient
  /** 局部更新当前用户（昵称、积分、头像等），避免整页刷新。 */
  updateUser(patch: Partial<BootstrapUser>): void
  /** 重新拉取 `/api/bootstrap`（用于积分、验证状态等跨页数据）。 */
  refreshBootstrap(): Promise<BootstrapPayload | null>
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) {
    throw new Error('useApp 必须在 AppContext 内使用')
  }
  return value
}
