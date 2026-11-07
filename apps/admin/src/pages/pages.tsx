import type { ReactNode } from 'react'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

export const OptionsPage = () => <Page title="站点配置">P4 将实现站点配置。</Page>
export const CustomizePage = () => <Page title="配色 / 首页">P4 将实现配色与首页设置。</Page>
export const ScorePage = () => <Page title="积分">P4 将实现积分设置。</Page>
export const ResourcePage = () => <Page title="资源">P4 将实现资源设置。</Page>
export const CommunicationsPage = () => <Page title="通信">P5 将实现通信列表。</Page>
export const CommunicationEditPage = () => <Page title="通信编辑器">P5 将实现通信编辑器。</Page>
export const UpdatePage = () => <Page title="更新">P4 将实现更新检测。</Page>
export const NotFoundPage = () => <Page title="404">页面不存在。</Page>
