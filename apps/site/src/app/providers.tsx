import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { assertBootstrap, type BootstrapUser } from '@neoskin/contract'
import type { i18n as I18nInstance } from 'i18next'
import { AppContext, type AppContextValue } from './context'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export function AppProviders({
  value,
  i18n,
  children,
}: {
  value: Omit<AppContextValue, 'updateUser' | 'refreshBootstrap'>
  i18n: I18nInstance | null
  children: ReactNode
}) {
  const [bootstrap, setBootstrap] = useState(value.bootstrap)

  const updateUser = useCallback((patch: Partial<BootstrapUser>) => {
    setBootstrap((previous) =>
      previous.user ? { ...previous, user: { ...previous.user, ...patch } } : previous,
    )
  }, [])

  const refreshBootstrap = useCallback(async () => {
    try {
      const response = await fetch('/api/bootstrap', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) {
        return null
      }
      const body = (await response.json()) as { code?: number; data?: unknown }
      const payload = assertBootstrap(
        typeof body.code === 'number' && 'data' in body ? body.data : body,
      )
      setBootstrap(payload)
      return payload
    } catch {
      return null
    }
  }, [])

  const contextValue = useMemo<AppContextValue>(
    () => ({ ...value, bootstrap, updateUser, refreshBootstrap }),
    [value, bootstrap, updateUser, refreshBootstrap],
  )
  const content = <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>

  return (
    <QueryClientProvider client={queryClient}>
      {i18n ? <I18nextProvider i18n={i18n}>{content}</I18nextProvider> : content}
    </QueryClientProvider>
  )
}
