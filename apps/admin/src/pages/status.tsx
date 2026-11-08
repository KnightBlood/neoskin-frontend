import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, Descriptions, Table, Tag } from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import { fetchStatus } from '../api/admin'

export function StatusPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const status = useQuery({ queryKey: ['admin-status'], queryFn: () => fetchStatus(http) })

  if (status.isError) {
    return (
      <section className="admin-page">
        <h1>{t('general.status', '运行状态')}</h1>
        <p className="admin-error">{normalizeApiError(status.error).message}</p>
      </section>
    )
  }

  const data = status.data
  const entries = (record: Record<string, string> | undefined) =>
    Object.entries(record ?? {}).map(([key, value]) => ({
      key,
      label: key,
      children: String(value),
    }))

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.status', '运行状态')}</h1>
      </header>

      <Card title="NeoSkin" loading={status.isPending}>
        <Descriptions column={1} size="small" items={entries(data?.bs)} />
      </Card>
      <Card title="服务器" loading={status.isPending}>
        <Descriptions column={1} size="small" items={entries(data?.server)} />
      </Card>
      <Card title="数据库" loading={status.isPending}>
        <Descriptions column={1} size="small" items={entries(data?.db)} />
      </Card>
      <Card title="插件" loading={status.isPending}>
        {data?.plugins && data.plugins.length > 0 ? (
          <Table
            size="small"
            rowKey={(row, index) => String((row as { name?: string })?.name ?? index)}
            dataSource={data.plugins as Array<Record<string, unknown>>}
            pagination={false}
            columns={[
              {
                title: '名称',
                render: (_: unknown, row: Record<string, unknown>) => (
                  <Tag>{String(row.name ?? row.title ?? '-')}</Tag>
                ),
              },
              {
                title: '版本',
                render: (_: unknown, row: Record<string, unknown>) => String(row.version ?? '-'),
              },
            ]}
          />
        ) : (
          <p className="admin-hint">暂无插件信息</p>
        )}
      </Card>
    </section>
  )
}
