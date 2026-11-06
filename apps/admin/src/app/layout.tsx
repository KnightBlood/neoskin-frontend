import { Link, Outlet, useLocation } from 'react-router'
import { Layout, Menu } from 'antd'
import { useApp } from './context'

const items = [
  { key: '/', label: <Link to="/">仪表盘</Link> },
  { key: '/users', label: <Link to="/users">用户</Link> },
  { key: '/players', label: <Link to="/players">玩家</Link> },
  { key: '/reports', label: <Link to="/reports">举报</Link> },
  { key: '/options', label: <Link to="/options">站点配置</Link> },
  { key: '/customize', label: <Link to="/customize">配色 / 首页</Link> },
  { key: '/score', label: <Link to="/score">积分</Link> },
  { key: '/resource', label: <Link to="/resource">资源</Link> },
  { key: '/communications', label: <Link to="/communications">通信</Link> },
  { key: '/i18n', label: <Link to="/i18n">翻译</Link> },
  { key: '/plugins/manage', label: <Link to="/plugins/manage">插件管理</Link> },
  { key: '/plugins/market', label: <Link to="/plugins/market">插件市场</Link> },
  { key: '/status', label: <Link to="/status">状态</Link> },
  { key: '/update', label: <Link to="/update">更新</Link> },
]

export function AdminLayout() {
  const { bootstrap } = useApp()
  const location = useLocation()
  const selected =
    items
      .map((item) => item.key)
      .filter((key) => key !== '/' && location.pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)[0] ?? '/'

  return (
    <Layout className="admin-shell">
      <Layout.Sider width={220} theme="light">
        <div className="admin-brand">{bootstrap.siteName}</div>
        <Menu mode="inline" selectedKeys={[selected]} items={items} />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="admin-header">
          <span>{bootstrap.user?.nickname ?? '未登录'}</span>
        </Layout.Header>
        <Layout.Content className="admin-main">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
