import { NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../app/context'
import { VerificationNotice } from '../../components/VerificationNotice'

interface MenuLink {
  to: string
  end?: boolean
  label: string
}

/** 用户中心布局：左侧导航 + 内容区（对齐 PHP `user.base` 的侧栏）。 */
export function UserShell() {
  const { t } = useTranslation()
  const { bootstrap } = useApp()
  const user = bootstrap.user

  const links: MenuLink[] = [
    { to: '/user', end: true, label: t('general.dashboard', '仪表盘') },
    { to: '/user/inbox', label: '站内信' },
    { to: '/user/closet', label: t('general.my-closet', '我的衣柜') },
    { to: '/user/player', label: t('general.player-manage', '角色管理') },
    { to: '/user/reports', label: t('general.my-reports', '我的举报') },
    { to: '/user/profile', label: t('general.profile', '个人资料') },
  ]
  if (bootstrap.features.oauth) {
    links.push({ to: '/user/oauth/manage', label: t('general.oauth-manage', 'OAuth2 应用') })
  }

  return (
    <div className="user-shell">
      <aside className="user-sidebar">
        {user ? (
          <div className="user-sidebar-profile">
            <img
              className="user-sidebar-avatar"
              src={user.avatar}
              alt={user.nickname}
              width={56}
              height={56}
            />
            <div className="user-sidebar-meta">
              <strong>{user.nickname}</strong>
              <span>
                {t('general.score', '积分')}：{user.score}
              </span>
            </div>
          </div>
        ) : null}
        <nav className="user-menu">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'user-menu-link is-active' : 'user-menu-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="user-content">
        <VerificationNotice />
        <Outlet />
      </div>
    </div>
  )
}
