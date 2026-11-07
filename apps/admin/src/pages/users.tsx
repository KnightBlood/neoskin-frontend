import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntApp,
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  deleteUser,
  fetchUsers,
  permissionLabel,
  toggleUserVerification,
  updateUserEmail,
  updateUserNickname,
  updateUserPassword,
  updateUserPermission,
  updateUserScore,
  type AdminUser,
} from '../api/admin'

type EditField = 'email' | 'nickname' | 'password' | 'score' | 'permission'

const PERMISSION_OPTIONS = [
  { value: -1, label: '封禁' },
  { value: 0, label: '普通用户' },
  { value: 1, label: '管理员' },
]

export function UsersPage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<{ user: AdminUser; field: EditField } | null>(null)
  const [value, setValue] = useState<string | number>('')
  const [busy, setBusy] = useState(false)

  const users = useQuery({
    queryKey: ['admin-users', query, page],
    queryFn: () => fetchUsers(http, { q: query, page }),
  })

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
    ])
  }

  function openEdit(user: AdminUser, field: EditField) {
    setEditing({ user, field })
    if (field === 'email') {
      setValue(user.email)
    } else if (field === 'nickname') {
      setValue(user.nickname)
    } else if (field === 'score') {
      setValue(user.score)
    } else if (field === 'permission') {
      setValue(user.permission)
    } else {
      setValue('')
    }
  }

  async function submitEdit() {
    if (!editing) {
      return
    }
    const { user, field } = editing
    setBusy(true)
    try {
      let result
      if (field === 'email') {
        result = await updateUserEmail(http, user.uid, String(value))
      } else if (field === 'nickname') {
        result = await updateUserNickname(http, user.uid, String(value))
      } else if (field === 'password') {
        result = await updateUserPassword(http, user.uid, String(value))
      } else if (field === 'score') {
        result = await updateUserScore(http, user.uid, Number(value))
      } else {
        result = await updateUserPermission(http, user.uid, Number(value))
      }
      message.success(result.message || '操作成功')
      setEditing(null)
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function toggleVerified(user: AdminUser) {
    try {
      const result = await toggleUserVerification(http, user.uid)
      message.success(result.message || '操作成功')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  async function removeUser(user: AdminUser) {
    try {
      const result = await deleteUser(http, user.uid)
      message.success(result.message || '操作成功')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  const columns = [
    { title: 'UID', dataIndex: 'uid', width: 80 },
    {
      title: t('general.nickname', '昵称'),
      dataIndex: 'nickname',
      render: (nickname: string, user: AdminUser) => (
        <div className="admin-user-cell">
          <strong>{nickname || '（未设置）'}</strong>
          <span>{user.email}</span>
        </div>
      ),
    },
    { title: t('general.score', '积分'), dataIndex: 'score', width: 90 },
    {
      title: '权限',
      dataIndex: 'permission',
      width: 120,
      render: (permission: number) => (
        <Tag color={permission >= 1 ? 'blue' : permission < 0 ? 'red' : 'default'}>
          {permissionLabel(permission)}
        </Tag>
      ),
    },
    {
      title: '邮箱验证',
      dataIndex: 'verified',
      width: 110,
      render: (verified: boolean) => (
        <Tag color={verified ? 'green' : 'orange'}>{verified ? '已验证' : '未验证'}</Tag>
      ),
    },
    {
      title: t('admin.operationsTitle', '操作'),
      width: 360,
      render: (_: unknown, user: AdminUser) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => openEdit(user, 'nickname')}>
            昵称
          </Button>
          <Button size="small" onClick={() => openEdit(user, 'email')}>
            邮箱
          </Button>
          <Button size="small" onClick={() => openEdit(user, 'password')}>
            密码
          </Button>
          <Button size="small" onClick={() => openEdit(user, 'score')}>
            积分
          </Button>
          <Button size="small" onClick={() => openEdit(user, 'permission')}>
            权限
          </Button>
          <Popconfirm
            title="切换邮箱验证状态？"
            onConfirm={() => void toggleVerified(user)}
            disabled={user.uid === bootstrap.user?.uid}
          >
            <Button size="small" disabled={user.uid === bootstrap.user?.uid}>
              验证
            </Button>
          </Popconfirm>
          <Popconfirm
            title="删除该用户？此操作不可恢复。"
            okButtonProps={{ danger: true }}
            onConfirm={() => void removeUser(user)}
            disabled={user.uid === bootstrap.user?.uid}
          >
            <Button size="small" danger disabled={user.uid === bootstrap.user?.uid}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const editingConfig = editing
    ? {
        email: { title: '修改邮箱', input: <Input value={String(value)} onChange={(e) => setValue(e.target.value)} /> },
        nickname: { title: '修改昵称', input: <Input value={String(value)} onChange={(e) => setValue(e.target.value)} /> },
        password: {
          title: '修改密码（8-16 位）',
          input: <Input.Password value={String(value)} onChange={(e) => setValue(e.target.value)} />,
        },
        score: {
          title: '修改积分',
          input: <InputNumber value={Number(value)} onChange={(next) => setValue(Number(next ?? 0))} style={{ width: '100%' }} />,
        },
        permission: {
          title: '修改权限',
          input: (
            <Select
              value={Number(value)}
              options={PERMISSION_OPTIONS}
              onChange={(next) => setValue(next)}
              style={{ width: '100%' }}
            />
          ),
        },
      }[editing.field]
    : null

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.user-manage', '用户管理')}</h1>
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
            placeholder="UID / 邮箱 / 昵称 / IP"
            onChange={(event) => setSearchInput(event.target.value)}
            allowClear
          />
          <Button type="primary" htmlType="submit">
            搜索
          </Button>
        </form>
      </header>

      <Table<AdminUser>
        rowKey="uid"
        loading={users.isPending}
        dataSource={users.data?.data ?? []}
        columns={columns}
        scroll={{ x: 980 }}
        pagination={{
          current: users.data?.current_page ?? page,
          pageSize: users.data?.per_page ?? 10,
          total: users.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => setPage(next),
        }}
      />

      <Modal
        open={editing !== null}
        title={editingConfig?.title}
        confirmLoading={busy}
        onCancel={() => setEditing(null)}
        onOk={() => void submitEdit()}
        destroyOnHidden
      >
        {editing?.field === 'password' ? (
          <p className="admin-hint">密码长度需为 8-16 位。</p>
        ) : null}
        {editingConfig?.input}
      </Modal>
    </section>
  )
}
