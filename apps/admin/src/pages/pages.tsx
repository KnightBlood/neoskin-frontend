import type { ReactNode } from 'react'
import { Card } from 'antd'

function Page({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

export function DashboardPage() {
  return (
    <Page title="仪表盘">
      <Card title="P4">仪表盘统计与图表将在 P4 实现。</Card>
    </Page>
  )
}

export const UsersPage = () => <Page title="用户">P4 将实现用户管理。</Page>
export const PlayersPage = () => <Page title="玩家">P4 将实现玩家管理。</Page>
export const ReportsPage = () => <Page title="举报">P4 将实现举报审核。</Page>
export const OptionsPage = () => <Page title="站点配置">P4 将实现站点配置。</Page>
export const CustomizePage = () => <Page title="配色 / 首页">P4 将实现配色与首页设置。</Page>
export const ScorePage = () => <Page title="积分">P4 将实现积分设置。</Page>
export const ResourcePage = () => <Page title="资源">P4 将实现资源设置。</Page>
export const CommunicationsPage = () => <Page title="通信">P5 将实现通信列表。</Page>
export const CommunicationEditPage = () => <Page title="通信编辑器">P5 将实现通信编辑器。</Page>
export const I18nPage = () => <Page title="翻译">P4 将实现翻译管理。</Page>
export const PluginsPage = () => <Page title="插件管理">P4 将实现插件管理。</Page>
export const MarketPage = () => <Page title="插件市场">P4 将实现插件市场。</Page>
export const StatusPage = () => <Page title="状态">P4 将实现运行状态。</Page>
export const UpdatePage = () => <Page title="更新">P4 将实现更新检测。</Page>
export const NotFoundPage = () => <Page title="404">页面不存在。</Page>
