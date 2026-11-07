import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from 'tdesign-react'
import { useApp } from '../app/context'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

export function HomePage() {
  const { bootstrap } = useApp()
  return (
    <Page title={bootstrap.siteName}>
      <p>{bootstrap.options.site_description ?? 'Blessing Skin Server'}</p>
      <div className="cards">
        <Card title="皮肤库">
          <Link to="/skinlib">进入皮肤库</Link>
        </Card>
        <Card title="用户中心">
          <Link to="/user">进入用户中心</Link>
        </Card>
      </div>
    </Page>
  )
}

export function UserDashboardPage() {
  return <Page title="用户中心">P3 将实现仪表盘。</Page>
}

export function ProfilePage() {
  return <Page title="个人资料">P3 将实现资料编辑。</Page>
}

export function PlayersPage() {
  return <Page title="我的角色">P3 将实现角色管理。</Page>
}

export function ClosetPage() {
  return <Page title="我的衣柜">P3 将实现衣柜管理。</Page>
}

export function InboxPage() {
  return <Page title="站内信">P3 将实现站内信。</Page>
}

export function ReportsPage() {
  return <Page title="我的举报">P3 将实现举报记录。</Page>
}

export function OAuthPage() {
  return <Page title="OAuth 应用">P3 将实现 OAuth 应用管理。</Page>
}

export function NotFoundPage() {
  return <Page title="404">页面不存在。</Page>
}
