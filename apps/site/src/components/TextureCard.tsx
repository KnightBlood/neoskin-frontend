import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { LibraryItem, TextureType } from '../api/skinlib'
import { previewPngUrl, previewUrl } from '../lib/texture'

export interface TextureCardProps {
  item: LibraryItem
  liked: boolean
  onToggleLike: (item: LibraryItem) => void
  onUploaderClick: (uploader: number) => void
}

export function TextureCard({ item, liked, onToggleLike, onUploaderClick }: TextureCardProps) {
  const { t } = useTranslation()
  const detailPath = `/skinlib/show/${item.tid}`

  return (
    <article className={liked ? 'texture-card is-liked' : 'texture-card'}>
      <Link className="texture-card-preview" to={detailPath} title={item.name}>
        <picture>
          <source srcSet={previewUrl(item.tid, 150)} type="image/webp" />
          <img src={previewPngUrl(item.tid, 150)} alt={item.name} loading="lazy" />
        </picture>
      </Link>
      <div className="texture-card-body">
        <div className="texture-card-title">
          {item.public ? null : (
            <span className="texture-lock" title={t('skinlib.private', '私密')}>
              🔒
            </span>
          )}
          <Link to={detailPath} title={item.name}>
            {item.name}
          </Link>
        </div>
        <div className="texture-card-meta">
          <span className={`texture-type texture-type-${item.type}`}>
            {humanizeType(item.type, t('general.cape', '披风'))}
          </span>
          <button
            type="button"
            className="texture-uploader"
            title={t('skinlib.show.uploader', '上传者')}
            onClick={() => onUploaderClick(item.uploader)}
          >
            {item.nickname}
          </button>
          <button
            type="button"
            className={liked ? 'texture-like is-liked' : 'texture-like'}
            aria-pressed={liked}
            aria-label={liked ? t('skinlib.removeFromCloset', '从衣柜中移除') : t('skinlib.addToCloset', '添加至衣柜')}
            title={liked ? t('skinlib.removeFromCloset', '从衣柜中移除') : t('skinlib.addToCloset', '添加至衣柜')}
            onClick={() => onToggleLike(item)}
          >
            <span aria-hidden="true">♥</span>
            <span className="texture-like-count">{item.likes}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export function humanizeType(type: TextureType, capeLabel: string): string {
  if (type === 'steve') {
    return 'Steve'
  }
  if (type === 'alex') {
    return 'Alex'
  }
  return capeLabel
}
