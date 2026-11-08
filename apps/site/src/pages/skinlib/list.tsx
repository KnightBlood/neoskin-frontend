import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Dialog, Input, Pagination, Select } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import {
  addToCloset,
  fetchClosetIds,
  fetchLibrary,
  normalizeFilter,
  normalizePage,
  normalizeSort,
  normalizeUploader,
  removeFromCloset,
  type LibraryItem,
  type SkinFilter,
} from '../../api/skinlib'
import { TextureCard } from '../../components/TextureCard'
import { PromptDialog } from '../../components/PromptDialog'
import { toast } from '../../lib/toast'
import { useApp } from '../../app/context'

function SearchIcon() {
  return (
    <svg className="skinlib-search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function SkinlibListPage() {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const [search, setSearch] = useSearchParams()
  const queryClient = useQueryClient()

  const filter = normalizeFilter(search.get('filter'))
  const keyword = search.get('keyword') ?? ''
  const sort = normalizeSort(search.get('sort'))
  const uploader = normalizeUploader(search.get('uploader'))
  const page = normalizePage(search.get('page'))

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [pendingAdd, setPendingAdd] = useState<LibraryItem | null>(null)
  const [pendingRemove, setPendingRemove] = useState<LibraryItem | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setKeywordInput(keyword)
  }, [keyword])

  const library = useQuery({
    queryKey: ['skinlib', filter, keyword, sort, uploader, page],
    queryFn: () => fetchLibrary(http, { filter, keyword, sort, uploader, page }),
    placeholderData: keepPreviousData,
  })

  const closet = useQuery({
    queryKey: ['closet-ids'],
    queryFn: () => fetchClosetIds(http),
    enabled: Boolean(bootstrap.user),
  })
  const closetIds = new Set(closet.data ?? [])

  function updateSearch(patch: Record<string, string | number | null>) {
    const next = new URLSearchParams(search)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === 0) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    setSearch(next)
  }

  function changeFilter(next: SkinFilter) {
    updateSearch({ filter: next === 'skin' ? null : next, page: null })
  }

  function changeSort(next: 'time' | 'likes') {
    updateSearch({ sort: next === 'time' ? null : next, page: null })
  }

  function submitSearch() {
    updateSearch({ keyword: keywordInput.trim() || null, page: null })
  }

  function toggleLike(item: LibraryItem) {
    if (!bootstrap.user) {
      toast.warning(t('skinlib.anonymous', '请先登录'))
      return
    }
    if (closetIds.has(item.tid)) {
      setPendingRemove(item)
    } else {
      setPendingAdd(item)
    }
  }

  async function confirmAdd(name: string) {
    if (!pendingAdd) {
      return
    }
    setBusy(true)
    try {
      const result = await addToCloset(http, pendingAdd.tid, name)
      setPendingAdd(null)
      if (result.code === 0) {
        toast.success(result.message)
        await invalidateCloset()
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
    if (!pendingRemove) {
      return
    }
    setBusy(true)
    try {
      const result = await removeFromCloset(http, pendingRemove.tid)
      setPendingRemove(null)
      if (result.code === 0) {
        toast.success(result.message)
        await invalidateCloset()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(false)
    }
  }

  async function invalidateCloset() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['skinlib'] }),
      queryClient.invalidateQueries({ queryKey: ['closet-ids'] }),
    ])
  }

  const filterOptions: Array<{ label: string; value: SkinFilter }> = [
    { label: t('skinlib.filter.skin', '（任意模型）'), value: 'skin' },
    { label: 'Steve', value: 'steve' },
    { label: 'Alex', value: 'alex' },
    { label: t('skinlib.filter.cape', '（披风）'), value: 'cape' },
  ]

  const items = library.data?.data ?? []
  const error = library.isError ? normalizeApiError(library.error) : null

  return (
    <section className="page skinlib-page">
      <div className="skinlib-heading">
        <h1>{t('general.skinlib', '皮肤库')}</h1>
        <span className="skinlib-uploader-hint">
          {uploader > 0
            ? t('skinlib.filter.uploader', {
                uid: uploader,
                defaultValue: `用户（UID = ${uploader}）上传`,
              }).replace(':uid', String(uploader))
            : t('skinlib.filter.allUsers', '所有用户')}
        </span>
      </div>

      <div className="skinlib-toolbar">
        <form
          className="skinlib-search"
          onSubmit={(event) => {
            event.preventDefault()
            submitSearch()
          }}
        >
          <Select
            className="skinlib-filter"
            value={filter}
            options={filterOptions}
            onChange={(value) => changeFilter(normalizeFilter(String(value)))}
          />
          <Input
            value={keywordInput}
            type="search"
            clearable
            prefixIcon={<SearchIcon />}
            placeholder={t('vendor.datatable.search', '搜索材质名称')}
            onChange={(next) => setKeywordInput(String(next))}
          />
          <Button
            className="skinlib-search-submit"
            type="submit"
            theme="primary"
          >
            {t('vendor.datatable.search', '搜索')}
          </Button>
        </form>
        <div className="skinlib-sort">
          <Button
            variant={sort === 'likes' ? 'base' : 'outline'}
            theme={sort === 'likes' ? 'primary' : 'default'}
            onClick={() => changeSort('likes')}
          >
            {t('skinlib.sort.likes', '最多收藏')}
          </Button>
          <Button
            variant={sort === 'time' ? 'base' : 'outline'}
            theme={sort === 'time' ? 'primary' : 'default'}
            onClick={() => changeSort('time')}
          >
            {t('skinlib.sort.time', '最新上传')}
          </Button>
          {bootstrap.user ? (
            <Button
              variant={uploader === bootstrap.user.uid ? 'base' : 'outline'}
              theme={uploader === bootstrap.user.uid ? 'primary' : 'default'}
              onClick={() =>
                updateSearch({
                  uploader: uploader === bootstrap.user?.uid ? null : bootstrap.user?.uid ?? null,
                  page: null,
                })
              }
            >
              {t('skinlib.seeMyUpload', '我上传的')}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setSearch(new URLSearchParams())}>
            {t('skinlib.reset', '清除筛选')}
          </Button>
        </div>
      </div>

      {error ? <Alert theme="error" message={error.message} /> : null}

      {library.isFetching ? <div className="skinlib-loading">加载中…</div> : null}

      {items.length > 0 ? (
        <div className="skinlib-grid">
          {items.map((item) => (
            <TextureCard
              key={item.tid}
              item={item}
              liked={closetIds.has(item.tid)}
              onToggleLike={toggleLike}
              onUploaderClick={(uid) =>
                updateSearch({ uploader: uid === uploader ? null : uid, page: null })
              }
            />
          ))}
        </div>
      ) : library.isPending ? null : (
        <p className="skinlib-empty">{t('general.noResult', '没有结果')}</p>
      )}

      {(library.data?.last_page ?? 1) > 1 ? (
        <div className="skinlib-pagination">
          <Pagination
            current={page}
            total={library.data?.total ?? 0}
            pageSize={library.data?.per_page ?? 20}
            showPageSize={false}
            showJumper
            onChange={(info) => updateSearch({ page: info.current > 1 ? info.current : null })}
          />
        </div>
      ) : null}

      <PromptDialog
        visible={pendingAdd !== null}
        title={t('skinlib.setItemName', '给你的皮肤起个名字吧~')}
        description={t('skinlib.applyNotice', '收藏后可以在我的衣柜里将皮肤应用至角色')}
        defaultValue={pendingAdd?.name ?? ''}
        confirmText={t('skinlib.addToCloset', '添加至衣柜')}
        busy={busy}
        validator={(value) => (value.trim() ? undefined : t('skinlib.emptyItemName', '你还没有填写要收藏的材质名称啊'))}
        onCancel={() => setPendingAdd(null)}
        onConfirm={(value) => void confirmAdd(value.trim())}
      />

      <Dialog
        visible={pendingRemove !== null}
        header={t('skinlib.removeFromCloset', '从衣柜中移除')}
        confirmBtn={{ content: t('skinlib.removeFromCloset', '从衣柜中移除'), theme: 'danger', loading: busy }}
        cancelBtn={{ content: '取消', disabled: busy }}
        onClose={() => setPendingRemove(null)}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemove()}
      >
        <p>{t('user.removeFromClosetNotice', '确定要从衣柜中移除这个材质吗？')}</p>
      </Dialog>
    </section>
  )
}
