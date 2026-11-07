import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { App as AntApp, Button, Input, Modal, Popconfirm, Select, Space, Table } from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  createLanguageLine,
  deleteLanguageLine,
  fetchLanguageLines,
  updateLanguageLine,
  type LanguageLine,
} from '../api/admin'

export function I18nPage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const locales = bootstrap.locales?.length ? bootstrap.locales : [bootstrap.locale]

  const [page, setPage] = useState(1)
  const [lang, setLang] = useState(bootstrap.locale)
  const [createOpen, setCreateOpen] = useState(false)
  const [group, setGroup] = useState('')
  const [key, setKey] = useState('')
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<LanguageLine | null>(null)
  const [busy, setBusy] = useState(false)

  const lines = useQuery({
    queryKey: ['admin-i18n', page],
    queryFn: () => fetchLanguageLines(http, page),
  })

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['admin-i18n'] })
  }

  async function submitCreate() {
    if (!group.trim() || !key.trim() || !text.trim()) {
      message.warning('分组、键与译文均不能为空')
      return
    }
    setBusy(true)
    try {
      await createLanguageLine(http, {
        group: group.trim(),
        key: key.trim(),
        lang,
        text: text.trim(),
      })
      message.success('翻译已添加')
      setCreateOpen(false)
      setGroup('')
      setKey('')
      setText('')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitEdit() {
    if (!editing) {
      return
    }
    setBusy(true)
    try {
      const result = await updateLanguageLine(http, editing.id, lang, text.trim())
      message.success(result.message || '操作成功')
      setEditing(null)
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(line: LanguageLine) {
    try {
      await deleteLanguageLine(http, line.id)
      message.success('翻译已删除')
      await invalidate()
    } catch (error) {
      message.error(normalizeApiError(error).message)
    }
  }

  function openEdit(line: LanguageLine) {
    setEditing(line)
    setText(line.text?.[lang] ?? '')
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '分组', dataIndex: 'group', width: 140 },
    { title: '键', dataIndex: 'key', width: 220 },
    {
      title: `译文（${lang}）`,
      render: (_: unknown, line: LanguageLine) => (
        <div className="admin-i18n-text">{line.text?.[lang] ?? '—'}</div>
      ),
    },
    { title: '更新时间', dataIndex: 'updated_at', width: 180 },
    {
      title: t('admin.operationsTitle', '操作'),
      width: 160,
      render: (_: unknown, line: LanguageLine) => (
        <Space size={4}>
          <Button size="small" onClick={() => openEdit(line)}>
            编辑
          </Button>
          <Popconfirm title="删除该翻译？" okButtonProps={{ danger: true }} onConfirm={() => void remove(line)}>
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
        <h1>{t('general.i18n', '翻译管理')}</h1>
        <Space>
          <Select
            value={lang}
            options={locales.map((locale) => ({ value: locale, label: locale }))}
            onChange={(next) => setLang(next)}
            style={{ width: 120 }}
          />
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            添加翻译
          </Button>
        </Space>
      </header>

      <Table<LanguageLine>
        rowKey="id"
        loading={lines.isPending}
        dataSource={lines.data?.data ?? []}
        columns={columns}
        scroll={{ x: 900 }}
        pagination={{
          current: lines.data?.current_page ?? page,
          pageSize: lines.data?.per_page ?? 10,
          total: lines.data?.total ?? 0,
          showSizeChanger: false,
          onChange: (next) => setPage(next),
        }}
      />

      <Modal
        open={createOpen}
        title="添加翻译"
        confirmLoading={busy}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreate()}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            value={group}
            placeholder="分组（如 front-end）"
            onChange={(event) => setGroup(event.target.value)}
          />
          <Input
            value={key}
            placeholder="键（如 user.sign）"
            onChange={(event) => setKey(event.target.value)}
          />
          <Input.TextArea
            value={text}
            rows={3}
            placeholder={`译文（${lang}）`}
            onChange={(event) => setText(event.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        open={editing !== null}
        title={`编辑翻译（${lang}）`}
        confirmLoading={busy}
        onCancel={() => setEditing(null)}
        onOk={() => void submitEdit()}
        destroyOnHidden
      >
        <p className="admin-hint">
          {editing?.group} / {editing?.key}
        </p>
        <Input.TextArea
          value={text}
          rows={4}
          onChange={(event) => setText(event.target.value)}
        />
      </Modal>
    </section>
  )
}
