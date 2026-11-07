import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntApp, Button, Input, Popconfirm, Space, Table, Tag } from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  fetchReports,
  reportStatusLabel,
  reviewReport,
  type AdminReport,
  type ReportAction,
} from '../api/admin'

const STATUS_COLORS = ['orange', 'green', 'default']

export function ReportsPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(0)

  const reports = useQuery({
    queryKey: ['admin-reports', query, page],
    queryFn: () => fetchReports(http, { q: query, page }),
  })

  async function review(report: AdminReport, action: ReportAction) {
    setBusyId(report.id)
    try {
      const result = await reviewReport(http, report.id, action)
      message.success(result.message || '操作成功')
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusyId(0)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: '材质',
      dataIndex: 'tid',
      width: 180,
      render: (tid: number, report: AdminReport) => (
        <div className="admin-user-cell">
          <strong>{report.texture?.name ?? `TID ${tid}`}</strong>
          <a href={`/app-next/site/skinlib/show/${tid}`} target="_blank" rel="noreferrer">
            查看材质
          </a>
        </div>
      ),
    },
    { title: '上传者', dataIndex: 'uploader', width: 100 },
    { title: '举报人', dataIndex: 'reporter', width: 100 },
    { title: '原因', dataIndex: 'reason' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: number) => (
        <Tag color={STATUS_COLORS[status] ?? 'default'}>{reportStatusLabel(status)}</Tag>
      ),
    },
    { title: '举报时间', dataIndex: 'report_at', width: 180 },
    {
      title: t('admin.operationsTitle', '操作'),
      width: 260,
      render: (_: unknown, report: AdminReport) =>
        report.status !== 0 ? (
          <span className="admin-hint">已处理</span>
        ) : (
          <Space size={4} wrap>
            <Popconfirm
              title="删除该材质并解决举报？"
              okButtonProps={{ danger: true }}
              onConfirm={() => void review(report, 'delete')}
              disabled={busyId === report.id}
            >
              <Button size="small" danger loading={busyId === report.id}>
                删除材质
              </Button>
            </Popconfirm>
            <Popconfirm
              title="封禁上传者并解决举报？"
              okButtonProps={{ danger: true }}
              onConfirm={() => void review(report, 'ban')}
              disabled={busyId === report.id}
            >
              <Button size="small" danger loading={busyId === report.id}>
                封禁
              </Button>
            </Popconfirm>
            <Popconfirm
              title="拒绝该举报？"
              onConfirm={() => void review(report, 'reject')}
              disabled={busyId === report.id}
            >
              <Button size="small" loading={busyId === report.id}>
                拒绝
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ]

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.report-manage', '举报管理')}</h1>
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setQuery(searchInput.trim())
          }}
        >
          <Input
            value={searchInput}
            placeholder="ID / TID / 举报人 / 原因"
            onChange={(event) => setSearchInput(event.target.value)}
            allowClear
          />
          <Button type="primary" htmlType="submit">
            搜索
          </Button>
        </form>
      </header>

      <Table<AdminReport>
        rowKey="id"
        loading={reports.isPending}
        dataSource={reports.data?.data ?? []}
        columns={columns}
        scroll={{ x: 1180 }}
        pagination={{
          current: reports.data?.current_page ?? page,
          pageSize: reports.data?.per_page ?? 9,
          total: reports.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => setPage(next),
        }}
      />
    </section>
  )
}
