import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, Input } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import {
  createOAuthClient,
  deleteOAuthClient,
  fetchOAuthClients,
  updateOAuthClient,
  type OAuthClient,
} from '../../api/user'
import { PromptDialog } from '../../components/PromptDialog'
import { toast } from '../../lib/toast'

/** `/user/oauth/manage`：Passport 客户端管理。 */
export function OAuthPage() {
  const { http } = useApp()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [createVisible, setCreateVisible] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createRedirect, setCreateRedirect] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const [renameTarget, setRenameTarget] = useState<OAuthClient | null>(null)
  const [redirectTarget, setRedirectTarget] = useState<OAuthClient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OAuthClient | null>(null)
  const [busy, setBusy] = useState(false)

  const clients = useQuery({
    queryKey: ['oauth-clients'],
    queryFn: () => fetchOAuthClients(http),
  })

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['oauth-clients'] })
  }

  async function confirmCreate() {
    if (!createName.trim() || !createRedirect.trim()) {
      toast.warning('应用名与回调地址均不能为空')
      return
    }
    setBusy(true)
    try {
      const client = await createOAuthClient(http, {
        name: createName.trim(),
        redirect: createRedirect.trim(),
      })
      toast.success('应用创建成功')
      setCreateVisible(false)
      setCreateName('')
      setCreateRedirect('')
      const secret = client.plain_secret || client.secret || ''
      if (secret) {
        setSecretValue(secret)
      }
      await invalidate()
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRename(name: string) {
    if (!renameTarget) {
      return
    }
    setBusy(true)
    try {
      await updateOAuthClient(http, renameTarget.id, {
        name,
        redirect: renameTarget.redirect,
      })
      toast.success('应用名已更新')
      setRenameTarget(null)
      await invalidate()
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRedirect(redirect: string) {
    if (!redirectTarget) {
      return
    }
    setBusy(true)
    try {
      await updateOAuthClient(http, redirectTarget.id, {
        name: redirectTarget.name,
        redirect,
      })
      toast.success('回调地址已更新')
      setRedirectTarget(null)
      await invalidate()
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }
    setBusy(true)
    try {
      await deleteOAuthClient(http, deleteTarget.id)
      toast.success('应用已删除')
      setDeleteTarget(null)
      await invalidate()
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  const apps = clients.data ?? []

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{t('general.oauth-manage', 'OAuth2 应用')}</h1>
        <Button theme="primary" onClick={() => setCreateVisible(true)}>
          {t('user.oauth.create', '创建应用')}
        </Button>
      </header>

      {clients.isError ? (
        <p className="user-empty">{normalizeApiError(clients.error).message}</p>
      ) : null}

      <div className="user-card">
        <div className="user-card-body user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>{t('user.oauth.id', '客户端 ID')}</th>
                <th>{t('user.oauth.name', '应用名')}</th>
                <th>{t('user.oauth.secret', '密钥')}</th>
                <th>{t('user.oauth.redirect', '回调地址')}</th>
                <th style={{ width: '230px' }}>{t('admin.operationsTitle', '操作')}</th>
              </tr>
            </thead>
            <tbody>
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="user-table-empty">
                    {clients.isPending ? '加载中…' : t('general.noResult', '没有结果')}
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr key={app.id}>
                    <td>{app.id}</td>
                    <td>{app.name}</td>
                    <td className="user-monospace">
                      {app.secret ? app.secret : '（创建时仅显示一次）'}
                    </td>
                    <td className="user-monospace">{app.redirect}</td>
                    <td>
                      <div className="user-inline-actions">
                        <Button size="small" variant="outline" onClick={() => setRenameTarget(app)}>
                          {t('user.oauth.edit-name', '改名称')}
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => setRedirectTarget(app)}
                        >
                          {t('user.oauth.edit-redirect', '改地址')}
                        </Button>
                        <Button
                          size="small"
                          theme="danger"
                          variant="outline"
                          onClick={() => setDeleteTarget(app)}
                        >
                          {t('user.oauth.remove', '删除')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        visible={createVisible}
        header={t('user.oauth.create', '创建应用')}
        cancelBtn={{ content: '取消', disabled: busy }}
        confirmBtn={{ content: '创建', theme: 'primary', loading: busy }}
        onClose={() => setCreateVisible(false)}
        onCancel={() => setCreateVisible(false)}
        onConfirm={() => void confirmCreate()}
      >
        <div className="user-form">
          <label className="user-field">
            <span>{t('user.oauth.name', '应用名')}</span>
            <Input value={createName} onChange={(next) => setCreateName(String(next))} />
          </label>
          <label className="user-field">
            <span>{t('user.oauth.redirect', '回调地址')}</span>
            <Input
              value={createRedirect}
              placeholder="https://example.com/callback"
              onChange={(next) => setCreateRedirect(String(next))}
            />
          </label>
        </div>
      </Dialog>

      <Dialog
        visible={secretValue !== ''}
        header={t('user.oauth.secret', '密钥')}
        cancelBtn={null}
        confirmBtn={{ content: '我已保存', theme: 'primary' }}
        onClose={() => setSecretValue('')}
        onConfirm={() => setSecretValue('')}
      >
        <p className="user-danger-text">密钥只会显示这一次，请立即复制保存。</p>
        <Input value={secretValue} readOnly />
      </Dialog>

      <PromptDialog
        visible={renameTarget !== null}
        title={t('user.oauth.name', '应用名')}
        defaultValue={renameTarget?.name ?? ''}
        busy={busy}
        onCancel={() => setRenameTarget(null)}
        onConfirm={(value) => void confirmRename(value.trim())}
      />

      <PromptDialog
        visible={redirectTarget !== null}
        title={t('user.oauth.redirect', '回调地址')}
        defaultValue={redirectTarget?.redirect ?? ''}
        busy={busy}
        onCancel={() => setRedirectTarget(null)}
        onConfirm={(value) => void confirmRedirect(value.trim())}
      />

      <Dialog
        visible={deleteTarget !== null}
        header={t('user.oauth.remove', '删除应用')}
        cancelBtn={{ content: '取消', disabled: busy }}
        confirmBtn={{ content: '删除', theme: 'danger', loading: busy }}
        onClose={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      >
        <p>{t('user.oauth.confirmRemove', '确定要删除这个应用吗？')}</p>
      </Dialog>
    </section>
  )
}
