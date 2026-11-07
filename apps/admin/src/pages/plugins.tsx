import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntApp,
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Upload,
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  fetchPlugins,
  installPluginByUrl,
  managePlugin,
  uploadPlugin,
  type AdminPlugin,
} from '../api/admin'

export function PluginsPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const plugins = useQuery({ queryKey: ['admin-plugins'], queryFn: () => fetchPlugins(http) })

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-plugins'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-market'] }),
    ])
  }

  async function toggle(plugin: AdminPlugin) {
    try {
      const result = await managePlugin(http, plugin.name, plugin.enabled ? 'disable' : 'enable')
      message.success(result.message || '操作成功')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  async function remove(plugin: AdminPlugin) {
    try {
      const result = await managePlugin(http, plugin.name, 'delete')
      message.success(result.message || '操作成功')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  async function installUrl() {
    if (!url.trim()) {
      message.warning('请输入 ZIP 地址')
      return
    }
    setBusy(true)
    try {
      const result = await installPluginByUrl(http, url.trim())
      if (result.code === 0) {
        message.success(result.message || '安装成功')
        setUrl('')
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

  const columns = [
    {
      title: '插件',
      dataIndex: 'title',
      render: (title: string, plugin: AdminPlugin) => (
        <div className="admin-user-cell">
          <strong>{title || plugin.name}</strong>
          <span>{plugin.name}</span>
        </div>
      ),
    },
    { title: '版本', dataIndex: 'version', width: 110 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '已启用' : '已禁用'}</Tag>
      ),
    },
    { title: '说明', dataIndex: 'description' },
    {
      title: t('admin.operationsTitle', '操作'),
      width: 260,
      render: (_: unknown, plugin: AdminPlugin) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => void toggle(plugin)}>
            {plugin.enabled ? '禁用' : '启用'}
          </Button>
          {plugin.readme ? (
            <Button
              size="small"
              onClick={() =>
                window.open(`/admin/plugins/readme/${encodeURIComponent(plugin.name)}`, '_blank')
              }
            >
              说明
            </Button>
          ) : null}
          <Popconfirm
            title="删除该插件？"
            okButtonProps={{ danger: true }}
            onConfirm={() => void remove(plugin)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.plugin-manage', '插件管理')}</h1>
        <Space wrap>
          <Upload
            accept=".zip"
            showUploadList={false}
            beforeUpload={(file) => {
              void (async () => {
                setBusy(true)
                try {
                  const result = await uploadPlugin(http, file)
                  if (result.code === 0) {
                    message.success(result.message || '安装成功')
                    await invalidate()
                  } else {
                    message.error(result.message)
                  }
                } catch (error) {
                  message.error(normalizeApiError(error).message)
                } finally {
                  setBusy(false)
                }
              })()
              return false
            }}
          >
            <Button loading={busy}>上传 ZIP</Button>
          </Upload>
          <Input
            value={url}
            placeholder="插件 ZIP 地址"
            style={{ width: 260 }}
            onChange={(event) => setUrl(event.target.value)}
          />
          <Button type="primary" loading={busy} onClick={() => void installUrl()}>
            在线安装
          </Button>
        </Space>
      </header>

      <Table<AdminPlugin>
        rowKey="name"
        loading={plugins.isPending}
        dataSource={plugins.data ?? []}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={false}
      />
    </section>
  )
}
