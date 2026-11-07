import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Checkbox, Dialog } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { uploadTexture, type TextureType } from '../../api/skinlib'
import {
  estimateUploadCost,
  isAlexTexture,
  readImageSize,
  validateTextureSize,
} from '../../lib/texture'
import { toast } from '../../lib/toast'
import { useApp } from '../../app/context'

const TexturePreview3D = lazy(() => import('../../components/TexturePreview3D'))

interface Dimensions {
  width: number
  height: number
}

export function SkinlibUploadPage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [type, setType] = useState<TextureType>('steve')
  const [isPrivate, setIsPrivate] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions | null>(null)
  const [uploading, setUploading] = useState(false)
  const [duplicatedTid, setDuplicatedTid] = useState<number | null>(null)

  const user = bootstrap.user
  const unverified = Boolean(user && !user.verified && bootstrap.features.emailVerification)
  const maxFileKb = numberOption(bootstrap.options.max_upload_file_size, 1024)
  const maxWidth = numberOption(bootstrap.options.max_texture_width, 8192)
  const scorePublic = numberOption(bootstrap.options.score_per_storage, 0)
  const scorePrivate = numberOption(bootstrap.options.private_score_per_storage, 0)
  const closetCost = numberOption(bootstrap.options.score_per_closet_item, 0)
  const award = numberOption(bootstrap.options.score_award_per_texture, 0)

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [objectUrl])

  const sizeError = dimensions ? validateTextureSize(dimensions.width, dimensions.height, type, maxWidth) : null
  const cost = file
    ? estimateUploadCost(file.size, isPrivate, {
        scorePerStorage: scorePublic,
        privateScorePerStorage: scorePrivate,
        closetItemCost: closetCost,
        award,
      })
    : 0
  const currentScore = user?.score ?? 0
  const contentPolicy =
    typeof bootstrap.options.content_policy === 'string' ? bootstrap.options.content_policy : ''

  async function selectFile(next: File | null) {
    setFile(next)
    if (!next) {
      setDimensions(null)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      setObjectUrl(null)
      return
    }
    if (next.type !== 'image/png' && next.type !== 'image/x-png') {
      toast.error(t('skinlib.fileExtError', '错误：皮肤文件必须为 PNG 格式'))
      return
    }
    if (maxFileKb > 0 && next.size > maxFileKb * 1024) {
      toast.error(`文件过大（上限 ${maxFileKb} KB）。`)
      return
    }
    if (!name && next.name.toLowerCase().endsWith('.png')) {
      setName(next.name.slice(0, -4))
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
    const url = URL.createObjectURL(next)
    setObjectUrl(url)
    try {
      const size = await readImageSize(next)
      setDimensions(size)
      if (type !== 'cape') {
        setType((await isAlexTexture(url)) ? 'alex' : 'steve')
      }
    } catch {
      setDimensions(null)
      toast.error('无法读取图片尺寸，请更换文件。')
    }
  }

  async function submit() {
    if (!file) {
      toast.error(t('skinlib.emptyUploadFile', '你还没有上传任何文件哦'))
      return
    }
    if (!name.trim()) {
      toast.error(t('skinlib.emptyTextureName', '给你的材质起个名字吧'))
      return
    }
    if (sizeError) {
      toast.error(sizeError)
      return
    }
    setUploading(true)
    try {
      const result = await uploadTexture(http, {
        name: name.trim(),
        type,
        file,
        isPublic: !isPrivate,
      })
      if (result.code === 0 && result.data?.tid) {
        navigate(`/skinlib/show/${result.data.tid}`)
        return
      }
      if (result.code === 2 && result.data?.tid) {
        setDuplicatedTid(result.data.tid)
        return
      }
      toast.error(result.message)
    } catch (error) {
      const normalized = normalizeApiError(error)
      toast.error(normalized.errors?.file?.[0] ?? normalized.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="page skinlib-detail">
      <div className="skinlib-detail-header">
        <h1>{t('skinlib.upload.title', '上传材质')}</h1>
      </div>

      {unverified ? (
        <Alert
          theme="warning"
          message="你的邮箱还未验证，验证后才能上传材质。"
        />
      ) : null}

      <div className="skinlib-detail-grid">
        <div className="skinlib-upload-form">
          <label className="auth-field" htmlFor="texture-name">
            <span>{t('skinlib.upload.texture-name', '材质名称')}</span>
            <input
              id="texture-name"
              className="texture-text-input"
              value={name}
              placeholder={t('skinlib.upload.name-rule', '给你的材质起个名字吧')}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <fieldset className="skinlib-type-field">
            <legend>{t('skinlib.upload.texture-type', '材质类型')}</legend>
            {(
              [
                { value: 'steve', label: 'Steve' },
                { value: 'alex', label: 'Alex' },
                { value: 'cape', label: t('general.cape', '披风') },
              ] as Array<{ value: TextureType; label: string }>
            ).map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <label className="auth-field">
            <span>{t('skinlib.upload.file', '材质文件')}</span>
            <input
              type="file"
              accept="image/png,image/x-png"
              onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
            />
            {maxFileKb > 0 ? <em>PNG，最大 {maxFileKb} KB</em> : null}
          </label>

          {sizeError ? <Alert theme="error" message={sizeError} /> : null}

          {contentPolicy ? (
            <div
              className="skinlib-policy"
              dangerouslySetInnerHTML={{ __html: contentPolicy }}
            />
          ) : null}

          <Checkbox checked={isPrivate} onChange={(checked) => setIsPrivate(Boolean(checked))}>
            {t('skinlib.upload.set-as-private', '设为私密')}
          </Checkbox>

          {isPrivate ? (
            <div className="skinlib-callout">
              {t('skinlib.upload.privacy-notice', '私密材质仅自己和管理员可见，且会消耗更多积分。')}
            </div>
          ) : null}

          {file ? (
            <div className={currentScore >= cost ? 'skinlib-callout is-ok' : 'skinlib-callout is-bad'}>
              <div>{t('skinlib.upload.cost', `消耗 ${cost} 积分`).replace(':score', String(cost))}</div>
              <div>
                {t('user.cur-score', '当前积分')}：{currentScore}
              </div>
              {!isPrivate && award > 0 ? (
                <div>{t('skinlib.upload.award', `公开上传奖励 ${award} 积分`).replace(':score', String(award))}</div>
              ) : null}
            </div>
          ) : null}

          <Button
            theme="primary"
            loading={uploading}
            disabled={unverified || Boolean(sizeError)}
            onClick={() => void submit()}
          >
            {uploading ? t('skinlib.uploading', '上传中') : t('skinlib.upload.button', '上传')}
          </Button>
        </div>

        <div className="texture-detail-preview">
          <div className="texture-detail-tabs">
            <span className="is-active">3D 预览</span>
          </div>
          {objectUrl ? (
            <Suspense fallback={<div className="texture-preview-loading">加载 3D 预览…</div>}>
              <TexturePreview3D
                skin={type === 'cape' ? undefined : objectUrl}
                cape={type === 'cape' ? objectUrl : undefined}
                slim={type === 'alex'}
              />
            </Suspense>
          ) : (
            <div className="texture-preview-loading">
              选择 PNG 文件后可在此预览。
            </div>
          )}
        </div>
      </div>

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

function numberOption(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
