import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
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
  value: AppContextValue
  i18n: I18nInstance | null
  children: ReactNode
}) {
  const content = <AppContext.Provider value={value}>{children}</AppContext.Provider>
  return (
    <QueryClientProvider client={queryClient}>
      {i18n ? <I18nextProvider i18n={i18n}>{content}</I18nextProvider> : content}
    </QueryClientProvider>
  )
}
