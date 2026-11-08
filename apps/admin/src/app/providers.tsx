import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
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
  const dark = value.bootstrap.user?.darkMode === true
  const lightTokens = {
    colorPrimary: '#0958d9',
    colorLink: '#0958d9',
    colorTextSecondary: '#595959',
    colorTextDescription: '#595959',
  }
  const content = (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: dark ? undefined : lightTokens,
        components: dark
          ? undefined
          : {
              Menu: { itemSelectedBg: '#e6f4ff', itemSelectedColor: '#0958d9' },
            },
      }}
    >
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </ConfigProvider>
  )
  return (
    <QueryClientProvider client={queryClient}>
      {i18n ? <I18nextProvider i18n={i18n}>{content}</I18nextProvider> : content}
    </QueryClientProvider>
  )
}
