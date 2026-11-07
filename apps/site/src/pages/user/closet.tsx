import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog, Dropdown, Pagination } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import {
  fetchCloset,
  fetchPlayers,
  renameClosetItem,
  setPlayerTextures,
  type ClosetItem,
} from '../../api/user'
import { removeFromCloset, setAvatar } from '../../api/skinlib'
import { previewPngUrl, previewUrl, textureUrl } from '../../lib/texture'
import { PromptDialog } from '../../components/PromptDialog'
import { toast } from '../../lib/toast'

const TexturePreview3D = lazy(() => import('../../components/TexturePreview3D'))

const PER_PAGE = 12

/** `/user/closet`：衣柜筛选、重命名、移除、设为头像与应用至角色。 */
export function ClosetPage() {
  const { http, refreshBootstrap } = useApp()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [category, setCategory] = useState<'skin' | 'cape'>('skin')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [skin, setSkin] = useState<ClosetItem | null>(null)
  const [cape, setCape] = useState<ClosetItem | null>(null)
  const [applyVisible, setApplyVisible] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ClosetItem | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ClosetItem | null>(null)
  const [avatarTarget, setAvatarTarget] = useState<ClosetItem | null>(null)
  const [busy, setBusy] = useState(false)

  const closet = useQuery({
    queryKey: ['closet-page', category, query, page],
    queryFn: () => fetchCloset(http, { category, q: query, page, perPage: PER_PAGE }),
    placeholderData: keepPreviousData,
  })
  const players = useQuery({
    queryKey: ['players'],
    queryFn: () => fetchPlayers(http),
    enabled: applyVisible,
  })

  const items = closet.data?.data ?? []

  function switchCategory(next: 'skin' | 'cape') {
    if (next !== category) {
      setCategory(next)
      setPage(1)
    }
  }

  function submitSearch() {
    setQuery(searchInput.trim())
    setPage(1)
  }

  function selectItem(item: ClosetItem) {
    if (item.type === 'cape') {
      setCape(item)
    } else {
      setSkin(item)
    }
  }

  function isSelected(item: ClosetItem): boolean {
    return item.type === 'cape' ? cape?.tid === item.tid : skin?.tid === item.tid
  }

  async function afterMutation() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['closet-page'] }),
      queryClient.invalidateQueries({ queryKey: ['closet-ids'] }),
      refreshBootstrap(),
    ])
  }

  async function confirmRename(name: string) {
    if (!renameTarget) {
      return
    }
    setBusy(true)
    try {
      const result = await renameClosetItem(http, renameTarget.tid, name)
      if (result.code === 0) {
        toast.success(result.message)
        setRenameTarget(null)
        await afterMutation()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) {
      return
    }
    setBusy(true)
    try {
      const result = await removeFromCloset(http, removeTarget.tid)
      if (result.code === 0) {
        toast.success(result.message)
        if (skin?.tid === removeTarget.tid) {
          setSkin(null)
        }
        if (cape?.tid === removeTarget.tid) {
          setCape(null)
        }
        setRemoveTarget(null)
        await afterMutation()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmAvatar() {
    if (!avatarTarget) {
      return
    }
    setBusy(true)
    try {
      const result = await setAvatar(http, avatarTarget.tid)
      if (result.code === 0) {
        toast.success(result.message)
        setAvatarTarget(null)
        await refreshBootstrap()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function applyToPlayer(pid: number) {
    if (!skin && !cape) {
      toast.info(t('user.emptySelectedTexture', '你还没有选择材质'))
      return
    }
    setBusy(true)
    try {
      const patch: { skin?: number; cape?: number } = {}
      if (skin) {
        patch.skin = skin.tid
      }
      if (cape) {
        patch.cape = cape.tid
      }
      const result = await setPlayerTextures(http, pid, patch)
      if (result.code === 0) {
        toast.success(result.message)
        setApplyVisible(false)
        await queryClient.invalidateQueries({ queryKey: ['players'] })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  const menuOptions = (item: ClosetItem) => {
    const options = [
      { value: 'rename', content: t('user.renameItem', '重命名') },
      { value: 'remove', content: t('user.removeItem', '移除') },
      { value: 'view', content: t('user.viewInSkinlib', '在皮肤库中查看') },
    ]
    if (item.type !== 'cape') {
      options.push({ value: 'avatar', content: t('user.setAsAvatar', '设为头像') })
    }
    return options
  }

  function handleMenu(item: ClosetItem, value: string) {
    if (value === 'rename') {
      setRenameTarget(item)
    } else if (value === 'remove') {
      setRemoveTarget(item)
    } else if (value === 'view') {
      void navigate(`/skinlib/show/${item.tid}`)
    } else if (value === 'avatar') {
      setAvatarTarget(item)
    }
  }

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{t('general.my-closet', '我的衣柜')}</h1>
        <span className="user-page-subtitle">
          共 {closet.data?.total ?? 0} 件
        </span>
      </header>

      <div className="user-toolbar">
        <div className="user-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={category === 'skin'}
            className={category === 'skin' ? 'user-tab is-active' : 'user-tab'}
            onClick={() => switchCategory('skin')}
          >
            {t('general.skin', '皮肤')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={category === 'cape'}
            className={category === 'cape' ? 'user-tab is-active' : 'user-tab'}
            onClick={() => switchCategory('cape')}
          >
            {t('general.cape', '披风')}
          </button>
          <Link className="user-tab" to="/skinlib/upload">
            {t('user.closet.upload', '上传材质')}
          </Link>
        </div>
        <form
          className="user-search-form"
          onSubmit={(event) => {
            event.preventDefault()
            submitSearch()
          }}
        >
          <input
            className="user-search"
            type="search"
            value={searchInput}
            placeholder={t('user.typeToSearch', '输入即搜索')}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Button type="submit" variant="outline">
            {t('vendor.datatable.search', '搜索')}
          </Button>
        </form>
      </div>

      {closet.isError ? (
        <p className="user-empty">{normalizeApiError(closet.error).message}</p>
      ) : null}

      {items.length === 0 && !closet.isPending ? (
        <p className="user-empty">
          {query ? (
            t('general.noResult', '没有结果')
          ) : (
            <>
              {t('user.closet.empty', '衣柜里啥都没有哦~')}{' '}
              <Link to={`/skinlib?filter=${category}`}>{t('general.skinlib', '皮肤库')}</Link>
            </>
          )}
        </p>
      ) : (
        <div className="closet-grid">
          {items.map((item) => (
            <article
              key={item.tid}
              className={isSelected(item) ? 'closet-item is-selected' : 'closet-item'}
              onClick={() => selectItem(item)}
            >
              <div className="closet-item-preview">
                <picture>
                  <source srcSet={previewUrl(item.tid, 150)} type="image/webp" />
                  <img src={previewPngUrl(item.tid, 150)} alt={item.pivot.item_name} loading="lazy" />
                </picture>
              </div>
              <div className="closet-item-footer">
                <span className="closet-item-name" title={item.pivot.item_name}>
                  {item.pivot.item_name}
                </span>
                <Dropdown
                  trigger="click"
                  options={menuOptions(item)}
                  onClick={(option) => handleMenu(item, String(option.value))}
                >
                  <button
                    type="button"
                    className="closet-item-menu"
                    aria-label={t('admin.operationsTitle', '操作')}
                    onClick={(event) => event.stopPropagation()}
                  >
                    ⚙
                  </button>
                </Dropdown>
              </div>
            </article>
          ))}
        </div>
      )}

      {(closet.data?.last_page ?? 1) > 1 ? (
        <div className="user-pagination">
          <Pagination
            current={page}
            total={closet.data?.total ?? 0}
            pageSize={closet.data?.per_page ?? PER_PAGE}
            showPageSize={false}
            showJumper
            onChange={(info) => setPage(info.current)}
          />
        </div>
      ) : null}

      <div className="closet-preview">
        <div className="closet-preview-viewer">
          {skin || cape ? (
            <Suspense fallback={<div className="texture-preview-loading">加载 3D 预览…</div>}>
              <TexturePreview3D
                skin={skin ? textureUrl(skin.hash) : undefined}
                cape={cape ? textureUrl(cape.hash) : undefined}
                slim={skin?.type === 'alex'}
              />
            </Suspense>
          ) : (
            <p className="user-empty">{t('user.emptySelectedTexture', '点击衣柜中的材质进行预览')}</p>
          )}
        </div>
        <div className="closet-preview-actions">
          <Button theme="primary" onClick={() => setApplyVisible(true)}>
            {t('user.useAs', '使用...')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSkin(null)
              setCape(null)
            }}
          >
            {t('user.resetSelected', '重置已选材质')}
          </Button>
        </div>
      </div>

      <Dialog
        visible={applyVisible}
        header={t('user.closet.use-as.title', '要给哪个角色使用呢？')}
        footer={null}
        onClose={() => setApplyVisible(false)}
      >
        {players.isPending ? (
          <p>加载中…</p>
        ) : (players.data ?? []).length === 0 ? (
          <p>{t('user.closet.use-as.empty', '你好像还没有添加任何角色哦')}</p>
        ) : (
          <div className="user-player-list">
            {(players.data ?? []).map((player) => (
              <button
                key={player.pid}
                type="button"
                className="user-player-choice"
                disabled={busy}
                onClick={() => void applyToPlayer(player.pid)}
              >
                <img src={`/avatar/${player.tid_skin}?size=45`} alt={player.name} width={45} height={45} />
                <span>{player.name}</span>
              </button>
            ))}
          </div>
        )}
      </Dialog>

      <PromptDialog
        visible={renameTarget !== null}
        title={t('user.renameClosetItem', '请输入新的名称：')}
        defaultValue={renameTarget?.pivot.item_name ?? ''}
        confirmText={t('general.submit', '提交')}
        busy={busy}
        validator={(value) =>
          value.trim() ? undefined : t('skinlib.emptyItemName', '你还没有填写要收藏的材质名称啊')
        }
        onCancel={() => setRenameTarget(null)}
        onConfirm={(value) => void confirmRename(value.trim())}
      />

      <Dialog
        visible={removeTarget !== null}
        header={t('user.removeItem', '移除')}
        cancelBtn={{ content: '取消', disabled: busy }}
        confirmBtn={{ content: '移除', theme: 'danger', loading: busy }}
        onClose={() => setRemoveTarget(null)}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemove()}
      >
        <p>{t('user.removeFromClosetNotice', '确定要从衣柜中移除此材质吗？')}</p>
      </Dialog>

      <Dialog
        visible={avatarTarget !== null}
        header={t('user.setAsAvatar', '设为头像')}
        cancelBtn={{ content: '取消', disabled: busy }}
        confirmBtn={{ content: '确定', theme: 'primary', loading: busy }}
        onClose={() => setAvatarTarget(null)}
        onCancel={() => setAvatarTarget(null)}
        onConfirm={() => void confirmAvatar()}
      >
        <p>确定要将这个材质设为头像吗？</p>
      </Dialog>
    </section>
  )
}
