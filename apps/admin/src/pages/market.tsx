import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntApp, Alert, Button, Card, Col, Row, Space, Tag } from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  downloadMarketPlugin,
  fetchMarket,
  type MarketPlugin,
} from '../api/admin'

export function MarketPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const market = useQuery({
    queryKey: ['admin-market'],
    queryFn: () => fetchMarket(http),
    retry: false,
  })

  const result = market.data
  const error =
    market.isError
      ? normalizeApiError(market.error)
      : !Array.isArray(result) && result && result.code !== 0
        ? { message: result.message }
        : null
  const packages: MarketPlugin[] = Array.isArray(result) ? result : []

  async function install(pkg: MarketPlugin) {
    try {
      const response = await downloadMarketPlugin(http, pkg.name)
      if (response.code === 0) {
        message.success(response.message || '安装成功')
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin-market'] }),
          queryClient.invalidateQueries({ queryKey: ['admin-plugins'] }),
        ])
      } else {
        message.error(response.message)
      }
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.plugin-market', '插件市场')}</h1>
        <Button onClick={() => void market.refetch()}>刷新</Button>
      </header>

      {error ? <Alert type="error" showIcon message={error.message} /> : null}

      <Row gutter={[16, 16]}>
        {packages.map((pkg) => (
          <Col key={pkg.name} xs={24} md={12} xl={8}>
            <Card
              title={pkg.title || pkg.name}
              extra={
                pkg.can_update ? (
                  <Tag color="orange">可更新</Tag>
                ) : pkg.installed ? (
                  <Tag color="green">已安装</Tag>
                ) : null
              }
            >
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <span className="admin-hint">
                  {pkg.name} · v{pkg.version}
                  {typeof pkg.installed === 'string' ? `（已装 ${pkg.installed}）` : ''}
                </span>
                <p className="admin-market-desc">{pkg.description}</p>
                <Button
                  type={pkg.can_update ? 'primary' : 'default'}
                  disabled={Boolean(pkg.installed) && !pkg.can_update}
                  onClick={() => void install(pkg)}
                >
                  {pkg.can_update ? '更新' : pkg.installed ? '已安装' : '安装'}
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {!market.isPending && packages.length === 0 && !error ? (
        <p className="admin-hint">暂无可用插件。</p>
      ) : null}
    </section>
  )
}
