import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  App as AntApp,
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Upload,
} from 'antd'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import {
  downloadUpdate,
  fetchOptionsGroup,
  installUpdate,
  uploadUpdate,
} from '../api/admin'

export function UpdatePage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const { message } = AntApp.useApp()

  const [busy, setBusy] = useState<'download' | 'install' | 'upload' | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const options = useQuery({
    queryKey: ['admin-options', 'options'],
    queryFn: () => fetchOptionsGroup(http, 'options'),
  })

  async function download() {
    setBusy('download')
    setNotice(null)
    try {
      const result = await downloadUpdate(http)
      if (result.code === 0) {
        if (result.data?.review) {
          setPending(true)
          setNotice({ type: 'success', text: result.message || '运行包已下载并校验，请确认后安装。' })
        } else {
          setNotice({ type: 'success', text: result.message || '更新完成' })
        }
      } else {
        setPending(false)
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
    setBusy('install')
    try {
      const result = await installUpdate(http)
      if (result.code === 0) {
        setPending(false)
        setNotice({ type: 'success', text: result.message || '安装完成' })
      } else {
        setNotice({ type: 'error', text: result.message || '安装失败' })
      }
    } catch (error) {
      setNotice({ type: 'error', text: normalizeApiError(error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>{t('general.check-update', '检查更新')}</h1>
      </header>

      {notice ? <Alert type={notice.type} showIcon message={notice.text} /> : null}

      <Card title="当前版本">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Blessing Skin">{bootstrap.version}</Descriptions.Item>
          <Descriptions.Item label="更新源">
            {String(options.data?.update_source ?? '（使用默认更新源）')}
          </Descriptions.Item>
          <Descriptions.Item label="上传限制">1 GiB</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="在线更新">
        <Space wrap>
          <Button type="primary" loading={busy === 'download'} onClick={() => void download()}>
            检查更新并下载
          </Button>
          <Button
            type="primary"
            danger
            disabled={!pending}
            loading={busy === 'install'}
            onClick={() => void install()}
          >
            安装已下载的运行包
          </Button>
        </Space>
        <p className="admin-hint" style={{ marginTop: 12 }}>
          下载时会自动读取更新源并校验 SHA-256；完整运行包需再次确认后安装。
        </p>
      </Card>

      <Card title="上传更新包">
        <Upload
          accept=".zip"
          showUploadList={false}
          beforeUpload={(file) => {
            void (async () => {
              setBusy('upload')
              setNotice(null)
              try {
                const result = await uploadUpdate(http, file)
                if (result.code === 0) {
                  setNotice({ type: 'success', text: result.message || '更新包已安装' })
                } else {
                  setNotice({ type: 'error', text: result.message || '上传失败' })
                }
              } catch (error) {
                setNotice({ type: 'error', text: normalizeApiError(error).message })
              } finally {
                setBusy(null)
              }
            })()
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
