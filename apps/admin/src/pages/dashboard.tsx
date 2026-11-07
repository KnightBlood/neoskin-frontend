import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Row, Statistic } from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import { fetchChart, fetchDashboard, type ChartPayload } from '../api/admin'

function LineChart({ chart }: { chart: ChartPayload }) {
  const series = chart.data
  const width = 720
  const height = 220
  const padding = 28
  const max = Math.max(1, ...series.flat())
  const stepX = (width - padding * 2) / Math.max(1, chart.xAxis.length - 1)
  const colors = ['#1677ff', '#52c41a']

  return (
    <div className="admin-chart">
      <div className="admin-chart-legend">
        {chart.labels.map((label, index) => (
          <span key={label}>
            <i style={{ background: colors[index % colors.length] }} />
            {label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="最近 31 天注册与上传">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d9d9d9" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d9d9d9" />
        {[0, 0.5, 1].map((ratio) => {
          const y = padding + (height - padding * 2) * (1 - ratio)
          return (
            <g key={ratio}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f0f0f0" />
              <text x={4} y={y + 4} fontSize={10} fill="#8c8c8c">
                {Math.round(max * ratio)}
              </text>
            </g>
          )
        })}
        {series.map((values, index) => {
          const points = values
            .map((value, i) => {
              const x = padding + stepX * i
              const y = padding + (height - padding * 2) * (1 - value / max)
              return `${x},${y}`
            })
            .join(' ')
          return (
            <polyline
              key={index}
              points={points}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth={2}
            />
          )
        })}
        {chart.xAxis.map((label, i) =>
          i % 5 === 0 ? (
            <text
              key={`${label}-${i}`}
              x={padding + stepX * i}
              y={height - 8}
              fontSize={10}
              fill="#8c8c8c"
              textAnchor="middle"
            >
              {label.slice(0, 2)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  )
}

export function DashboardPage() {
  const { http } = useApp()
  const { t } = useTranslation()

  const stats = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => fetchDashboard(http) })
  const chart = useQuery({ queryKey: ['admin-chart'], queryFn: () => fetchChart(http) })
  const error = stats.isError ? normalizeApiError(stats.error) : null

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.dashboard', '仪表盘')}</h1>
        <Button onClick={() => void Promise.all([stats.refetch(), chart.refetch()])}>刷新</Button>
      </header>

      {error ? <p className="admin-error">{error.message}</p> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="用户" value={stats.data?.users ?? 0} loading={stats.isPending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="角色" value={stats.data?.players ?? 0} loading={stats.isPending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="材质" value={stats.data?.textures ?? 0} loading={stats.isPending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="存储空间"
              value={stats.data?.storageHuman ?? '0KB'}
              loading={stats.isPending}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近 31 天" loading={chart.isPending}>
        {chart.data ? <LineChart chart={chart.data} /> : <p>暂无数据</p>}
      </Card>
    </section>
  )
}
