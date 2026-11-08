import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App as AntApp,
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Tag,
  Upload,
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  downloadUpdate,
  fetchOptionsGroup,
  fetchUpdateInfo,
  installUpdate,
  uploadUpdate,
} from '../api/admin'

export function UpdatePage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const [busy, setBusy] = useState<'download' | 'install' | 'upload' | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const options = useQuery({
    queryKey: ['admin-options', 'options'],
    queryFn: () => fetchOptionsGroup(http, 'options'),
  })
  const info = useQuery({
    queryKey: ['admin-update-info'],
    queryFn: () => fetchUpdateInfo(http),
    retry: false,
  })

  const canInstall = downloaded || Boolean(info.data?.package)

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-update-info'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-options', 'options'] }),
    ])
  }

  async function download() {
    setBusy('download')
    setNotice(null)
    try {
      const result = await downloadUpdate(http)
      if (result.code === 0) {
        if (result.data?.review) {
          setDownloaded(true)
          setNotice({ type: 'success', text: result.message || '运行包已下载并校验，请确认后安装。' })
        } else {
          setNotice({ type: 'success', text: result.message || '更新完成' })
        }
        await refresh()
      } else {
        setDownloaded(false)
        setNotice({
          type: 'error',
          text: result.message || '已是最新版本，或更新源暂不可用。',
        })
      }
    } catch (error) {
      setNotice({ type: 'error', text: normalizeApiError(error).message })
    } finally {
      setBusy(null)
    }
  }

  async function install() {
    const packageId = info.data?.package?.id
    if (!packageId) {
      setNotice({ type: 'error', text: '没有待安装的运行包，请先下载。' })
      return
    }
    setBusy('install')
    try {
      const result = await installUpdate(http, packageId)
      if (result.code === 0) {
        setDownloaded(false)
        setNotice({ type: 'success', text: result.message || '安装完成' })
        await refresh()
      } else {
        setNotice({ type: 'error', text: result.message || '安装失败' })
      }
    } catch (error) {
      setNotice({ type: 'error', text: normalizeApiError(error).message })
    } finally {
      setBusy(null)
    }
  }

  async function upload(file: File) {
    setBusy('upload')
    setNotice(null)
    try {
      const result = await uploadUpdate(http, file)
      if (result.code === 0) {
        setNotice({ type: 'success', text: result.message || '更新包已安装' })
        await refresh()
      } else {
        setNotice({ type: 'error', text: result.message || '上传失败' })
      }
    } catch (error) {
      setNotice({ type: 'error', text: normalizeApiError(error).message })
    } finally {
      setBusy(null)
    }
  }

  const data = info.data
  const limitValue = data?.upload_limits?.upload ?? data?.upload_limits?.application
  const uploadLimit =
    typeof limitValue === 'number'
      ? limitValue >= 1024 * 1024 * 1024
        ? `${(limitValue / (1024 * 1024 * 1024)).toFixed(0)} GB`
        : limitValue >= 1024 * 1024
          ? `${(limitValue / (1024 * 1024)).toFixed(0)} MB`
          : `${Math.round(limitValue / 1024)} KB`
      : String(limitValue ?? '64 MB')
  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.check-update', '检查更新')}</h1>
        <Button loading={info.isFetching} onClick={() => void info.refetch()}>
          重新检查
        </Button>
      </header>

      {notice ? <Alert type={notice.type} showIcon message={notice.text} /> : null}
      {data?.error ? <Alert type="warning" showIcon message={data.error} /> : null}

      <Card title="版本信息" loading={info.isPending}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="当前版本">
            {data?.current || bootstrap.version}
          </Descriptions.Item>
          <Descriptions.Item label="最新版本">
            {data?.latest || '未知'}
            {data?.can_update ? (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                可更新
              </Tag>
            ) : data?.latest ? (
              <Tag color="green" style={{ marginLeft: 8 }}>
                已是最新
              </Tag>
            ) : null}
          </Descriptions.Item>
          <Descriptions.Item label="更新源">
            {String(options.data?.update_source ?? '（使用默认更新源）')}
          </Descriptions.Item>
          <Descriptions.Item label="上传限制">{uploadLimit}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="在线更新">
        <Space wrap>
          <Button
            type="primary"
            loading={busy === 'download'}
            disabled={Boolean(data) && data?.can_update === false && !data?.error}
            onClick={() => void download()}
          >
            下载最新运行包
          </Button>
          <Button
            type="primary"
            danger
            disabled={!canInstall}
            loading={busy === 'install'}
            onClick={() => void install()}
          >
            安装已下载的运行包
          </Button>
        </Space>
        <p className="admin-hint" style={{ marginTop: 12 }}>
          下载时会自动校验 SHA-256；完整运行包需再次确认后安装。
        </p>
      </Card>

      <Card title="上传更新包">
        <Upload
          accept=".zip"
          showUploadList={false}
          beforeUpload={(file) => {
            void upload(file)
            return false
          }}
        >
          <Button loading={busy === 'upload'}>选择 ZIP 并上传</Button>
        </Upload>
        <p className="admin-hint" style={{ marginTop: 12 }}>
          用于手动上传发布包，包内需包含版本信息与校验文件。
        </p>
      </Card>
    </section>
  )
}
