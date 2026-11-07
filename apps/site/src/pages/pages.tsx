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

export function NotFoundPage() {
  return <Page title="404">页面不存在。</Page>
}
