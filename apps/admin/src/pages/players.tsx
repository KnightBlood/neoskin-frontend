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
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  deletePlayer,
  fetchPlayers,
  updatePlayerName,
  updatePlayerOwner,
  updatePlayerTexture,
  type AdminPlayer,
} from '../api/admin'

type DialogKind = 'name' | 'owner' | 'texture'

export function PlayersPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<{ player: AdminPlayer; kind: DialogKind } | null>(null)
  const [name, setName] = useState('')
  const [owner, setOwner] = useState(1)
  const [textureType, setTextureType] = useState<'skin' | 'cape'>('skin')
  const [textureTid, setTextureTid] = useState(0)
  const [busy, setBusy] = useState(false)

  const players = useQuery({
    queryKey: ['admin-players', query, page],
    queryFn: () => fetchPlayers(http, { q: query, page }),
  })

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-players'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
    ])
  }

  function openDialog(player: AdminPlayer, kind: DialogKind) {
    setEditing({ player, kind })
    if (kind === 'name') {
      setName(player.name)
    } else if (kind === 'owner') {
      setOwner(player.uid)
    } else {
      setTextureType('skin')
      setTextureTid(player.tid_skin)
    }
  }

  async function submit() {
    if (!editing) {
      return
    }
    setBusy(true)
    try {
      const { player, kind } = editing
      const result =
        kind === 'name'
          ? await updatePlayerName(http, player.pid, name.trim())
          : kind === 'owner'
            ? await updatePlayerOwner(http, player.pid, owner)
            : await updatePlayerTexture(http, player.pid, textureType, textureTid)
      if (result.code === 0) {
        message.success(result.message || '操作成功')
        setEditing(null)
        await invalidate()
      } else {
        message.error(result.message)
      }
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(player: AdminPlayer) {
    try {
      const result = await deletePlayer(http, player.pid)
      message.success(result.message || '操作成功')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  const columns = [
    { title: 'PID', dataIndex: 'pid', width: 80 },
    { title: t('general.player.player-name', '角色名'), dataIndex: 'name' },
    { title: 'UID', dataIndex: 'uid', width: 90 },
    { title: '皮肤 TID', dataIndex: 'tid_skin', width: 110 },
    { title: '披风 TID', dataIndex: 'tid_cape', width: 110 },
    {
      title: t('admin.operationsTitle', '操作'),
      width: 280,
      render: (_: unknown, player: AdminPlayer) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => openDialog(player, 'name')}>
            改名
          </Button>
          <Button size="small" onClick={() => openDialog(player, 'owner')}>
            拥有者
          </Button>
          <Button size="small" onClick={() => openDialog(player, 'texture')}>
            材质
          </Button>
          <Popconfirm
            title="删除该角色？"
            okButtonProps={{ danger: true }}
            onConfirm={() => void remove(player)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const titles: Record<DialogKind, string> = {
    name: '修改角色名',
    owner: '修改拥有者',
    texture: '设置材质',
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.player-manage', '角色管理')}</h1>
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
            placeholder="PID / 角色名 / UID"
            onChange={(event) => setSearchInput(event.target.value)}
            allowClear
          />
          <Button type="primary" htmlType="submit">
            搜索
          </Button>
        </form>
      </header>

      <Table<AdminPlayer>
        rowKey="pid"
        loading={players.isPending}
        dataSource={players.data?.data ?? []}
        columns={columns}
        scroll={{ x: 860 }}
        pagination={{
          current: players.data?.current_page ?? page,
          pageSize: players.data?.per_page ?? 10,
          total: players.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => setPage(next),
        }}
      />

      <Modal
        open={editing !== null}
        title={editing ? titles[editing.kind] : ''}
        confirmLoading={busy}
        onCancel={() => setEditing(null)}
        onOk={() => void submit()}
        destroyOnHidden
      >
        {editing?.kind === 'name' ? (
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        ) : null}
        {editing?.kind === 'owner' ? (
          <InputNumber
            value={owner}
            min={1}
            style={{ width: '100%' }}
            onChange={(next) => setOwner(Number(next ?? 1))}
          />
        ) : null}
        {editing?.kind === 'texture' ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              value={textureType}
              options={[
                { value: 'skin', label: '皮肤' },
                { value: 'cape', label: '披风' },
              ]}
              onChange={(next) => setTextureType(next)}
              style={{ width: '100%' }}
            />
            <InputNumber
              value={textureTid}
              min={0}
              style={{ width: '100%' }}
              onChange={(next) => setTextureTid(Number(next ?? 0))}
            />
            <span className="admin-hint">TID = 0 表示清除该类型材质。</span>
          </Space>
        ) : null}
      </Modal>
    </section>
  )
}
