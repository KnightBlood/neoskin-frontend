import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Dialog, Select } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import {
  addToCloset,
  deleteTexture,
  fetchClosetIds,
  fetchTexture,
  removeFromCloset,
  renameTexture,
  reportTexture,
  setAvatar,
  setTexturePrivacy,
  setTextureType,
  type TextureType,
} from '../../api/skinlib'
import { previewPngUrl, rawTextureUrl, textureUrl } from '../../lib/texture'
import { toast } from '../../lib/toast'
import { PromptDialog } from '../../components/PromptDialog'
import { useApp } from '../../app/context'

const TexturePreview3D = lazy(() => import('../../components/TexturePreview3D'))

const typeOptions: Array<{ label: string; value: TextureType }> = [
  { label: 'Steve', value: 'steve' },
  { label: 'Alex', value: 'alex' },
  { label: '披风', value: 'cape' },
]

export function SkinlibDetailPage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const tid = Number(params.tid)
  const validTid = Number.isFinite(tid) && tid > 0

  const [previewMode, setPreviewMode] = useState<'3d' | '2d'>('3d')
  const [addOpen, setAddOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [duplicatedTid, setDuplicatedTid] = useState<number | null>(null)
  const [typeDraft, setTypeDraft] = useState<TextureType>('steve')
  const [busy, setBusy] = useState(false)

  const textureQuery = useQuery({
    queryKey: ['texture', tid],
    queryFn: () => fetchTexture(http, tid),
    enabled: validTid,
  })
  const closetQuery = useQuery({
    queryKey: ['closet-ids'],
    queryFn: () => fetchClosetIds(http),
    enabled: Boolean(bootstrap.user),
  })

  const texture = textureQuery.data
  const liked = new Set(closetQuery.data ?? []).has(tid)
  const canEdit = Boolean(texture && bootstrap.user && (bootstrap.user.uid === texture.uploader || bootstrap.user.isAdmin))

  useEffect(() => {
    if (texture) {
      document.title = `${texture.name} · ${bootstrap.siteName}`
    }
  }, [texture, bootstrap.siteName])

  const scoreModification = Number(bootstrap.options.reporter_score_modification ?? 0)
  const reportDescription =
    scoreModification > 0
      ? `举报被采纳后你将获得 ${scoreModification} 积分。`
      : scoreModification < 0
        ? `举报将扣除 ${-scoreModification} 积分。`
        : undefined

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['texture', tid] }),
      queryClient.invalidateQueries({ queryKey: ['skinlib'] }),
      queryClient.invalidateQueries({ queryKey: ['closet-ids'] }),
    ])
  }

  async function addToClosetWithName(name: string) {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await addToCloset(http, texture.tid, name)
      setAddOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
        await refreshAll()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function removeFromClosetNow() {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await removeFromCloset(http, texture.tid)
      setRemoveOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
        await refreshAll()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function reportNow(reason: string) {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await reportTexture(http, texture.tid, reason)
      setReportOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function renameNow(name: string) {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await renameTexture(http, texture.tid, name)
      setRenameOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
        await refreshAll()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function applyType() {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await setTextureType(http, texture.tid, typeDraft)
      setTypeOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
        await refreshAll()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePrivacy() {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await setTexturePrivacy(http, texture.tid)
      setPrivacyOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
        await refreshAll()
      } else if (result.code === 2 && result.data?.tid) {
        setDuplicatedTid(result.data.tid)
        toast.warning(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteNow() {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await deleteTexture(http, texture.tid)
      setDeleteOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['skinlib'] }),
          queryClient.invalidateQueries({ queryKey: ['closet-ids'] }),
        ])
        navigate('/skinlib', { replace: true })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function setAvatarNow() {
    if (!texture) {
      return
    }
    setBusy(true)
    try {
      const result = await setAvatar(http, texture.tid)
      setAvatarOpen(false)
      if (result.code === 0) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  function download() {
    if (!texture) {
      return
    }
    const link = document.createElement('a')
    link.href = rawTextureUrl(texture.tid)
    link.download = `${texture.name}.png`
    link.click()
  }

  if (!validTid) {
    return (
      <section className="page">
        <Alert theme="error" message="材质地址不正确。" />
        <p>
          <Link to="/skinlib">返回皮肤库</Link>
        </p>
      </section>
    )
  }

  if (textureQuery.isError) {
    const error = normalizeApiError(textureQuery.error)
    return (
      <section className="page">
        <Alert theme="error" message={error.status === 404 ? '材质不存在。' : error.message} />
        <p>
          <Link to="/skinlib">返回皮肤库</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="page skinlib-detail">
      <div className="skinlib-detail-header">
        <h1>{texture?.name ?? '材质详情'}</h1>
        <Link to="/skinlib">返回皮肤库</Link>
      </div>

      <div className="skinlib-detail-grid">
        <div className="texture-detail-preview">
          <div className="texture-detail-tabs">
            <button
              type="button"
              className={previewMode === '3d' ? 'is-active' : ''}
              onClick={() => setPreviewMode('3d')}
            >
              3D 预览
            </button>
            <button
              type="button"
              className={previewMode === '2d' ? 'is-active' : ''}
              onClick={() => setPreviewMode('2d')}
            >
              2D 预览
            </button>
          </div>
          {texture ? (
            previewMode === '3d' ? (
              <Suspense fallback={<div className="texture-preview-loading">加载 3D 预览…</div>}>
                <TexturePreview3D
                  skin={texture.type === 'cape' ? undefined : textureUrl(texture.hash)}
                  cape={texture.type === 'cape' ? textureUrl(texture.hash) : undefined}
                  slim={texture.type === 'alex'}
                />
              </Suspense>
            ) : (
              <img
                className="texture-detail-image"
                src={previewPngUrl(texture.tid, 400)}
                alt={texture.name}
              />
            )
          ) : (
            <div className="texture-preview-loading">加载中…</div>
          )}
        </div>

        <div className="skinlib-detail-side">
          <div className="skinlib-actions">
            {bootstrap.user ? (
              <Button
                theme={liked ? 'success' : 'primary'}
                variant={liked ? 'outline' : 'base'}
                loading={busy}
                onClick={() => (liked ? setRemoveOpen(true) : setAddOpen(true))}
              >
                {liked
                  ? t('skinlib.removeFromCloset', '从衣柜中移除')
                  : t('skinlib.addToCloset', '添加至衣柜')}
              </Button>
            ) : (
              <Button theme="default" variant="outline" disabled title={t('skinlib.show.anonymous', '请先登录')}>
                {t('skinlib.addToCloset', '添加至衣柜')}
              </Button>
            )}
            {bootstrap.user && texture && texture.type !== 'cape' ? (
              <Button variant="outline" onClick={() => setAvatarOpen(true)}>
                {t('user.setAsAvatar', '设为头像')}
              </Button>
            ) : null}
            <Button variant="outline" onClick={download}>
              {t('skinlib.show.download', '下载')}
            </Button>
            {bootstrap.user && bootstrap.features.reports ? (
              <Button variant="outline" onClick={() => setReportOpen(true)}>
                {t('skinlib.report.title', '举报')}
              </Button>
            ) : null}
            <span className={liked ? 'skinlib-likes is-liked' : 'skinlib-likes'}>
              ♥ {texture?.likes ?? 0}
            </span>
          </div>

          <dl className="skinlib-facts">
            <dt>{t('skinlib.show.name', '名称')}</dt>
            <dd>
              <span className="skinlib-fact-value">{texture?.name ?? '—'}</span>
              {canEdit ? (
                <Button size="small" variant="text" onClick={() => setRenameOpen(true)}>
                  编辑
                </Button>
              ) : null}
            </dd>

            <dt>{t('skinlib.show.model', '模型')}</dt>
            <dd>
              <span className="skinlib-fact-value">
                {texture ? (texture.type === 'cape' ? t('general.cape', '披风') : texture.type) : '—'}
              </span>
              {canEdit ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setTypeDraft(texture?.type ?? 'steve')
                    setTypeOpen(true)
                  }}
                >
                  编辑
                </Button>
              ) : null}
            </dd>

            <dt>Hash</dt>
            <dd className="skinlib-fact-mono">{texture?.hash ?? '—'}</dd>

            <dt>{t('skinlib.show.size', '大小')}</dt>
            <dd>{texture ? `${texture.size} KB` : '—'}</dd>

            <dt>{t('skinlib.show.uploader', '上传者')}</dt>
            <dd>
              {texture ? (
                <Link
                  to={`/skinlib?filter=${texture.type === 'cape' ? 'cape' : 'skin'}&uploader=${texture.uploader}`}
                >
                  UID {texture.uploader}
                </Link>
              ) : (
                '—'
              )}
            </dd>

            <dt>{t('skinlib.show.upload-at', '上传时间')}</dt>
            <dd>{texture?.upload_at ?? '—'}</dd>
          </dl>
        </div>
      </div>

      {canEdit && texture ? (
        <div className="skinlib-manage">
          <div>
            <h2>{t('skinlib.show.manage', '材质管理')}</h2>
            <p>{t('skinlib.show.manage-notice', '你可以管理自己上传的材质。')}</p>
          </div>
          <div className="skinlib-manage-actions">
            <Button theme="warning" variant="outline" onClick={() => setPrivacyOpen(true)}>
              {texture.public ? t('skinlib.setAsPrivate', '设为隐私') : t('skinlib.setAsPublic', '设为公开')}
            </Button>
            <Button theme="danger" variant="outline" onClick={() => setDeleteOpen(true)}>
              {t('skinlib.show.delete-texture', '删除材质')}
            </Button>
          </div>
        </div>
      ) : null}

      <PromptDialog
        visible={addOpen}
        title={t('skinlib.setItemName', '给你的皮肤起个名字吧~')}
        description={t('skinlib.applyNotice', '收藏后可以在我的衣柜里将皮肤应用至角色')}
        defaultValue={texture?.name ?? ''}
        confirmText={t('skinlib.addToCloset', '添加至衣柜')}
        busy={busy}
        validator={(value) => (value.trim() ? undefined : t('skinlib.emptyItemName', '你还没有填写要收藏的材质名称啊'))}
        onCancel={() => setAddOpen(false)}
        onConfirm={(value) => void addToClosetWithName(value.trim())}
      />

      <PromptDialog
        visible={reportOpen}
        title={t('skinlib.report.title', '举报')}
        description={reportDescription}
        placeholder={t('skinlib.report.reason', '请填写举报理由')}
        confirmText={t('skinlib.report.title', '举报')}
        busy={busy}
        validator={(value) => (value.trim() ? undefined : '请填写举报理由。')}
        onCancel={() => setReportOpen(false)}
        onConfirm={(value) => void reportNow(value.trim())}
      />

      <PromptDialog
        visible={renameOpen}
        title={t('skinlib.setNewTextureName', '请输入新的材质名称：')}
        defaultValue={texture?.name ?? ''}
        busy={busy}
        validator={(value) => (value.trim() ? undefined : t('skinlib.emptyNewTextureName', '你还没有输入新名称啊'))}
        onCancel={() => setRenameOpen(false)}
        onConfirm={(value) => void renameNow(value.trim())}
      />

      <Dialog
        visible={removeOpen}
        header={t('skinlib.removeFromCloset', '从衣柜中移除')}
        confirmBtn={{ content: t('skinlib.removeFromCloset', '从衣柜中移除'), theme: 'danger', loading: busy }}
        cancelBtn={{ content: '取消', disabled: busy }}
        onClose={() => setRemoveOpen(false)}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => void removeFromClosetNow()}
      >
        <p>{t('user.removeFromClosetNotice', '确定要从衣柜中移除这个材质吗？')}</p>
      </Dialog>

      <Dialog
        visible={avatarOpen}
        header={t('user.setAvatar', '设置头像')}
        confirmBtn={{ content: '确定', loading: busy }}
        cancelBtn={{ content: '取消', disabled: busy }}
        onClose={() => setAvatarOpen(false)}
        onCancel={() => setAvatarOpen(false)}
        onConfirm={() => void setAvatarNow()}
      >
        <p>{t('user.setAvatarNotice', '确定要将这个材质设为头像吗？')}</p>
      </Dialog>

      <Dialog
        visible={typeOpen}
        header={t('skinlib.setNewTextureModel', '切换模型')}
        confirmBtn={{ content: '确定', loading: busy }}
        cancelBtn={{ content: '取消', disabled: busy }}
        onClose={() => setTypeOpen(false)}
        onCancel={() => setTypeOpen(false)}
        onConfirm={() => void applyType()}
      >
        <Select
          value={typeDraft}
          options={typeOptions}
          onChange={(value) => setTypeDraft(String(value) as TextureType)}
        />
      </Dialog>

      <Dialog
        visible={privacyOpen}
        header={texture?.public ? '设为隐私' : '设为公开'}
        confirmBtn={{ content: '确定', theme: 'warning', loading: busy }}
        cancelBtn={{ content: '取消', disabled: busy }}
        onClose={() => setPrivacyOpen(false)}
        onCancel={() => setPrivacyOpen(false)}
        onConfirm={() => void togglePrivacy()}
      >
        <p>
          {texture?.public
            ? t('skinlib.setPrivateNotice', '设为隐私后，只有你自己和管理员可以看到这个材质。')
            : t('skinlib.setPublicNotice', '设为公开后，所有访客都可以看到这个材质。')}
        </p>
      </Dialog>

      <Dialog
        visible={deleteOpen}
        header={t('skinlib.show.delete-texture', '删除材质')}
        confirmBtn={{ content: '删除', theme: 'danger', loading: busy }}
        cancelBtn={{ content: '取消', disabled: busy }}
        onClose={() => setDeleteOpen(false)}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteNow()}
      >
        <p>{t('skinlib.deleteNotice', '删除后无法恢复，确定要继续吗？')}</p>
      </Dialog>

      <Dialog
        visible={duplicatedTid !== null}
        header={t('skinlib.upload.repeated', '该材质已存在')}
        confirmBtn={{ content: t('user.viewInSkinlib', '在皮肤库中查看') }}
        cancelBtn={{ content: '关闭' }}
        onClose={() => setDuplicatedTid(null)}
        onCancel={() => setDuplicatedTid(null)}
        onConfirm={() => {
          if (duplicatedTid !== null) {
            const target = duplicatedTid
            setDuplicatedTid(null)
            navigate(`/skinlib/show/${target}`)
          }
        }}
      >
        <p>相同内容的材质已经存在。</p>
      </Dialog>
    </section>
  )
}
