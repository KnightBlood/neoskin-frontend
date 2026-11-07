import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntApp, Button, Popconfirm, Space, Table, Tag } from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  fetchCommunications,
  withdrawCommunication,
  type CommunicationItem,
  type CommunicationKind,
  type CommunicationStatus,
} from '../api/admin'

const KIND_LABELS: Record<CommunicationKind, string> = {
  announcement: '公告',
  message: '站内信',
  both: '公告与站内信',
}

const STATUS_META: Record<CommunicationStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'green' },
  withdrawn: { label: '已撤回', color: 'orange' },
}

export function CommunicationsPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const list = useQuery({
    queryKey: ['admin-communications', page],
    queryFn: () => fetchCommunications(http, page),
  })

  async function withdraw(item: CommunicationItem) {
    try {
      const result = await withdrawCommunication(http, item.id)
      message.success(result.message || '内容已撤回。')
      await queryClient.invalidateQueries({ queryKey: ['admin-communications'] })
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  const columns = [
    { title: '标题', dataIndex: 'title' },
    {
      title: '发布位置',
      dataIndex: 'kind',
      width: 140,
      render: (kind: CommunicationKind) => KIND_LABELS[kind] ?? kind,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: CommunicationStatus) => (
        <Tag color={STATUS_META[status]?.color}>{STATUS_META[status]?.label ?? status}</Tag>
      ),
    },
    {
      title: '已读 / 投递',
      width: 130,
      render: (_: unknown, item: CommunicationItem) =>
        `${item.read_count} / ${item.delivery_count}`,
    },
    { title: '更新时间', dataIndex: 'updated_at', width: 180 },
    {
      title: t('admin.operationsTitle', '操作'),
      width: 200,
      render: (_: unknown, item: CommunicationItem) => (
        <Space size={4} wrap>
          <Link to={`/communications/${item.id}`}>
            <Button size="small">编辑</Button>
          </Link>
          {item.status === 'published' ? (
            <Popconfirm
              title={`撤回「${item.title}」？`}
              okButtonProps={{ danger: true }}
              onConfirm={() => void withdraw(item)}
            >
              <Button size="small" danger>
                撤回
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>通知与公告</h1>
        <Space wrap>
          <Link to="/communications/new">
            <Button type="primary">新建站内信</Button>
          </Link>
          <Link to="/communications/announcement">
            <Button>编辑站点公告</Button>
          </Link>
        </Space>
      </header>

      <Table<CommunicationItem>
        rowKey="id"
        loading={list.isPending}
        dataSource={list.data?.data ?? []}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{
          current: list.data?.current_page ?? page,
          pageSize: list.data?.per_page ?? 15,
          total: list.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => setPage(next),
        }}
      />
    </section>
  )
}
