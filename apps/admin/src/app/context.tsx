import { createContext, useContext } from 'react'
import type { BootstrapPayload } from '@neoskin/contract'
import type { HttpClient } from '@neoskin/core'

export interface AppContextValue {
  bootstrap: BootstrapPayload
  http: HttpClient
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) {
    throw new Error('useApp 必须在 AppContext 内使用')
  }
  return value
}
