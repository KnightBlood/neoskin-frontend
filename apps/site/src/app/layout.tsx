import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Button, Dropdown, MessagePlugin } from 'tdesign-react'
import { useTranslation } from 'react-i18next'
import { useApp } from './context'

const fallbackLocales = [
  'zh_CN',
  'zh_TW',
  'en',
  'de_DE',
  'es_ES',
  'fr_FR',
  'it_IT',
  'ja_JP',
  'ko_KR',
  'nl_NL',
  'pt_PT',
  'ru_RU',
  'el_GR',
]

export function SiteLayout() {
  const { bootstrap, http } = useApp()
  const { t } = useTranslation()
  const location = useLocation()
  const [dark, setDark] = useState(bootstrap.user?.darkMode === true)
  const [busy, setBusy] = useState(false)
  const locales = bootstrap.locales?.length ? bootstrap.locales : fallbackLocales

  function switchLocale(locale: string) {
    if (locale === bootstrap.locale) {
      return
    }
    document.cookie = `locale=${locale}; path=/; max-age=${120 * 60}`
    locationAssign(location.pathname + location.search)
  }

  async function toggleDarkMode() {
    if (!bootstrap.user) {
      MessagePlugin.warning('登录后才能切换深色模式')
      return
    }
    setBusy(true)
    const next = !dark
    try {
      await http.put('/user/dark-mode', { dark_mode: next ? 1 : 0 })
      setDark(next)
      document.documentElement.dataset.theme = next ? 'dark' : 'light'
    } catch {
      MessagePlugin.error('切换失败，请稍后再试')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    try {
      await http.post('/auth/logout')
    } catch {
      // 已登出或会话过期，直接回首页。
    } finally {
      setBusy(false)
      locationAssign(bootstrap.basePath || '/')
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          {bootstrap.siteName}
        </Link>
        <nav className="site-nav">
          <Link to="/skinlib">{t('general.skinlib', '皮肤库')}</Link>
          {bootstrap.user ? (
            <>
              <Link to="/skinlib/upload">{t('skinlib.upload.title', '上传材质')}</Link>
              <Link to="/user">{bootstrap.user.nickname}</Link>
              <Link to="/user/closet">{t('general.my-closet', '衣柜')}</Link>
              {bootstrap.features.oauth ? (
                <Link to="/user/oauth/manage">{t('general.oauth-manage', 'OAuth 应用')}</Link>
              ) : null}
              {bootstrap.user.isAdmin ? <a href="/app-next/admin/">管理</a> : null}
            </>
          ) : (
            <>
              <Link to="/auth/login">{t('general.login', '登录')}</Link>
              {bootstrap.features.registration ? (
                <Link to="/auth/register">{t('general.register', '注册')}</Link>
              ) : null}
            </>
          )}
        </nav>
        <div className="site-actions">
          <Dropdown
            options={locales.map((locale) => ({ value: locale, content: locale }))}
            onClick={(option) => switchLocale(String(option.value))}
          >
            <Button variant="text">{bootstrap.locale}</Button>
          </Dropdown>
          <Button
            variant="text"
            loading={busy}
            title={dark ? '切换到浅色模式' : '切换到深色模式'}
            onClick={toggleDarkMode}
          >
            {dark ? '☀' : '☾'}
          </Button>
          {bootstrap.user ? (
            <Button variant="text" onClick={logout} loading={busy} id="logout-button">
              {t('general.logout', '退出登录')}
            </Button>
          ) : null}
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        {bootstrap.siteName} · {bootstrap.version}
      </footer>
    </div>
  )
}

function locationAssign(path: string) {
  window.location.assign(path)
}
