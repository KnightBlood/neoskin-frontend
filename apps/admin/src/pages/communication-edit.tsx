import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  fetchCommunication,
  fetchCommunications,
  importCommunication,
  previewCommunication,
  saveCommunication,
  type CommunicationBlock,
  type CommunicationBlockType,
  type CommunicationEditorData,
} from '../api/admin'

const BLOCK_LABELS: Record<CommunicationBlockType, string> = {
  text: '文本',
  heading: '标题',
  alert: '提示框',
  collapse: '折叠卡片',
  divider: '分隔线',
}

const TONES = [
  { value: 'info', label: '信息（青色）' },
  { value: 'success', label: '成功（绿色）' },
  { value: 'warning', label: '提醒（黄色）' },
  { value: 'danger', label: '重要（红色）' },
  { value: 'primary', label: '主题（蓝色）' },
  { value: 'secondary', label: '次要（灰色）' },
]

type Variant = 'new' | 'announcement' | 'edit'

function emptyEditor(kind: 'message' | 'announcement'): CommunicationEditorData {
  return {
    title: kind === 'announcement' ? '站点公告' : '',
    kind,
    locale: '',
    editor: 'blocks',
    source: '',
    blocks: [],
    audience: { receiver: 'all' },
  }
}

export function CommunicationEditPage({ variant }: { variant: Variant }) {
  const { http, bootstrap } = useApp()
  const navigate = useNavigate()
  const params = useParams()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const fallbackId = params.id ? Number(params.id) : undefined

  const [data, setData] = useState<CommunicationEditorData>(() =>
    emptyEditor(variant === 'announcement' ? 'announcement' : 'message'),
  )
  const [status, setStatus] = useState<string | undefined>()
  const [selected, setSelected] = useState(-1)
  const [preview, setPreview] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(variant !== 'new')
  const [importing, setImporting] = useState(false)
  const timer = useRef<number | null>(null)

  const announcementSeed = useQuery({
    queryKey: ['admin-communications', 1],
    queryFn: () => fetchCommunications(http, 1),
    enabled: variant === 'announcement',
  })

  const editing = useQuery({
    queryKey: ['admin-communication', fallbackId],
    queryFn: () => fetchCommunication(http, fallbackId as number),
    enabled: variant === 'edit' && Boolean(fallbackId),
  })

  useEffect(() => {
    if (variant === 'edit' && editing.data) {
      setData(editing.data)
      setStatus(editing.data.status)
      setSelected(editing.data.blocks.length ? 0 : -1)
      setLoading(false)
    }
  }, [variant, editing.data])

  useEffect(() => {
    if (variant !== 'announcement' || !announcementSeed.data) {
      return
    }
    const hit = announcementSeed.data.data.find((item) => item.kind === 'announcement')
    if (hit) {
      void fetchCommunication(http, hit.id).then((result) => {
        setData(result)
        setStatus(result.status)
        setSelected(result.blocks.length ? 0 : -1)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [variant, announcementSeed.data, http])

  const blocksJson = useMemo(() => JSON.stringify(data.blocks), [data.blocks])

  useEffect(() => {
    if (loading) {
      return
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
    }
    timer.current = window.setTimeout(() => {
      void previewCommunication(http, {
        title: data.title || '预览',
        kind: 'announcement',
        receiver: 'all',
        operation: 'draft',
        editor: data.editor,
        source: data.source,
        blocks_json: blocksJson,
      })
        .then((result) => {
          setPreview(result.html)
          setPreviewError('')
        })
        .catch((error) => setPreviewError(normalizeApiError(error).message))
    }, 300)
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
      }
    }
  }, [http, loading, data.title, data.editor, data.source, blocksJson])

  function patch(patchValue: Partial<CommunicationEditorData>) {
    setData((previous) => ({ ...previous, ...patchValue }))
  }

  function addBlock(type: CommunicationBlockType) {
    if (data.blocks.length >= 80) {
      message.warning('最多添加 80 个组件')
      return
    }
    const block: CommunicationBlock = {
      type,
      title: type === 'heading' ? '新标题' : type === 'collapse' ? '折叠卡片标题' : '',
      content: '',
      tone: 'info',
      expanded: false,
    }
    patch({ blocks: [...data.blocks, block] })
    setSelected(data.blocks.length)
  }

  function updateBlock(index: number, blockPatch: Partial<CommunicationBlock>) {
    patch({
      blocks: data.blocks.map((block, i) => (i === index ? { ...block, ...blockPatch } : block)),
    })
  }

  function moveBlock(index: number, to: number) {
    if (to < 0 || to >= data.blocks.length) {
      return
    }
    const next = data.blocks.slice()
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item!)
    patch({ blocks: next })
    setSelected(to)
  }

  function removeBlock(index: number) {
    const next = data.blocks.filter((_, i) => i !== index)
    patch({ blocks: next })
    setSelected(Math.min(index, next.length - 1))
  }

  function switchMode(next: 'blocks' | 'source') {
    if (next === data.editor) {
      return
    }
    if (next === 'source') {
      patch({ editor: 'source', source: preview || data.source })
      return
    }
    void importSource()
  }

  async function importSource() {
    setImporting(true)
    try {
      const result = await importCommunication(http, data.source)
      patch({ blocks: result.blocks, editor: 'blocks' })
      setSelected(result.blocks.length ? 0 : -1)
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setImporting(false)
    }
  }

  async function save(operation: 'draft' | 'publish') {
    if (!data.title.trim()) {
      message.warning('请填写标题')
      return
    }
    setBusy(true)
    try {
      const result = await saveCommunication(
        http,
        {
          title: data.title.trim(),
          kind: data.kind,
          editor: data.editor,
          source: data.source,
          blocks_json: blocksJson,
          locale: data.locale,
          receiver: data.audience.receiver,
          uid: data.audience.uid ?? '',
          email: data.audience.email ?? '',
          operation,
        },
        variant === 'edit' ? fallbackId : undefined,
      )
      if (result.code === 0) {
        message.success(result.message || '内容已保存。')
        await queryClient.invalidateQueries({ queryKey: ['admin-communications'] })
        navigate('/communications')
      } else {
        message.error(result.message)
      }
    } catch (error) {
      message.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  const block = selected >= 0 ? data.blocks[selected] : undefined
  const editingStatus = status ?? data.status
  const publishLabel =
    editingStatus === 'published'
      ? '更新发布内容'
      : editingStatus === 'withdrawn'
        ? '重新发布'
        : '发布'

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>
          {data.kind === 'announcement'
            ? '编辑站点公告'
            : variant === 'edit'
              ? `编辑站内信 #${fallbackId}`
              : '新建站内信'}
        </h1>
        <Link to="/communications">
          <Button>返回列表</Button>
        </Link>
      </header>

      {loading ? <p className="admin-hint">加载中…</p> : null}

      <Card loading={loading}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item label="标题">
                <Input
                  value={data.title}
                  maxLength={100}
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item label="发布位置">
                <Select
                  value={data.kind}
                  options={[
                    { value: 'announcement', label: '站点公告' },
                    { value: 'message', label: '站内信' },
                    { value: 'both', label: '公告与站内信' },
                  ]}
                  onChange={(next) => patch({ kind: next })}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item label="公告语言">
                <Input
                  value={data.locale}
                  maxLength={20}
                  placeholder="默认（所有语言）；或 zh_CN"
                  onChange={(event) => patch({ locale: event.target.value })}
                />
              </Form.Item>
            </Col>
          </Row>

          {data.kind !== 'announcement' ? (
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="站内信收件人">
                  <Select
                    value={data.audience.receiver}
                    options={[
                      { value: 'all', label: '全部用户' },
                      { value: 'normal', label: '普通用户' },
                      { value: 'uid', label: '指定 UID' },
                      { value: 'email', label: '指定邮箱' },
                    ]}
                    onChange={(receiver) =>
                      patch({ audience: { ...data.audience, receiver } })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="UID">
                  <Input
                    type="number"
                    min={1}
                    disabled={data.audience.receiver !== 'uid'}
                    value={String(data.audience.uid ?? '')}
                    onChange={(event) =>
                      patch({ audience: { ...data.audience, uid: event.target.value } })
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="邮箱">
                  <Input
                    type="email"
                    disabled={data.audience.receiver !== 'email'}
                    value={String(data.audience.email ?? '')}
                    onChange={(event) =>
                      patch({ audience: { ...data.audience, email: event.target.value } })
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          ) : null}
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="内容设计器">
            <Space style={{ marginBottom: 12 }} wrap>
              <Select
                value={data.editor}
                options={[
                  { value: 'blocks', label: '可视化组件' },
                  { value: 'source', label: 'Markdown / HTML 源码' },
                ]}
                onChange={(next) => switchMode(next)}
                style={{ width: 190 }}
              />
            </Space>

            {data.editor === 'blocks' ? (
              <>
                <Space wrap style={{ marginBottom: 12 }}>
                  {(Object.keys(BLOCK_LABELS) as CommunicationBlockType[]).map((type) => (
                    <Button key={type} size="small" onClick={() => addBlock(type)}>
                      + {BLOCK_LABELS[type]}
                    </Button>
                  ))}
                </Space>
                <div className="communication-canvas">
                  {data.blocks.length === 0 ? (
                    <p className="admin-hint">从上方添加组件，或切换源码模式导入已有内容。</p>
                  ) : null}
                  {data.blocks.map((item, index) => (
                    <div
                      key={`${item.type}-${index}`}
                      className={
                        selected === index ? 'communication-block is-selected' : 'communication-block'
                      }
                      onClick={() => setSelected(index)}
                    >
                      <div className="communication-block-title">
                        {index + 1}. {BLOCK_LABELS[item.type]}
                        {item.title || item.content ? (
                          <span> · {(item.title || item.content || '').slice(0, 40)}</span>
                        ) : null}
                      </div>
                      <Space size={4} onClick={(event) => event.stopPropagation()}>
                        <Button size="small" onClick={() => moveBlock(index, index - 1)}>
                          上移
                        </Button>
                        <Button size="small" onClick={() => moveBlock(index, index + 1)}>
                          下移
                        </Button>
                        <Button size="small" danger onClick={() => removeBlock(index)}>
                          删除
                        </Button>
                      </Space>
                    </div>
                  ))}
                </div>

                {block ? (
                  <Card size="small" title={`组件属性 · ${BLOCK_LABELS[block.type]}`} style={{ marginTop: 12 }}>
                    <Form layout="vertical">
                      {block.type === 'heading' || block.type === 'collapse' ? (
                        <Form.Item label="标题">
                          <Input
                            value={block.title ?? ''}
                            maxLength={200}
                            onChange={(event) =>
                              updateBlock(selected, { title: event.target.value })
                            }
                          />
                        </Form.Item>
                      ) : null}
                      {block.type !== 'heading' && block.type !== 'divider' ? (
                        <Form.Item label="正文（支持 Markdown）">
                          <Input.TextArea
                            rows={6}
                            value={block.content ?? ''}
                            maxLength={10000}
                            onChange={(event) =>
                              updateBlock(selected, { content: event.target.value })
                            }
                          />
                        </Form.Item>
                      ) : null}
                      {block.type === 'alert' || block.type === 'collapse' ? (
                        <Form.Item label="颜色">
                          <Select
                            value={block.tone ?? 'info'}
                            options={TONES}
                            onChange={(tone) => updateBlock(selected, { tone })}
                          />
                        </Form.Item>
                      ) : null}
                      {block.type === 'collapse' ? (
                        <Form.Item label="默认展开">
                          <Switch
                            checked={Boolean(block.expanded)}
                            onChange={(expanded) => updateBlock(selected, { expanded })}
                          />
                        </Form.Item>
                      ) : null}
                    </Form>
                  </Card>
                ) : null}
              </>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.TextArea
                  rows={18}
                  className="communication-source"
                  value={data.source}
                  maxLength={100000}
                  onChange={(event) => patch({ source: event.target.value })}
                />
                <Button loading={importing} onClick={() => void importSource()}>
                  导入为可视化组件
                </Button>
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="实时预览">
            {previewError ? <p className="admin-error">{previewError}</p> : null}
            <div
              className="communication-preview"
              // 预览由后端按站点规则渲染并净化。
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </Card>
        </Col>
      </Row>

      <Space wrap>
        <Button type="primary" loading={busy} onClick={() => void save('publish')}>
          {publishLabel}
        </Button>
        {editingStatus !== 'published' ? (
          <Button loading={busy} onClick={() => void save('draft')}>
            保存草稿
          </Button>
        ) : null}
        <Link to="/communications">
          <Button>返回列表</Button>
        </Link>
        {data.id ? <Tag>#{data.id}</Tag> : null}
        <span className="admin-hint">{bootstrap.siteName}</span>
      </Space>
    </section>
  )
}
