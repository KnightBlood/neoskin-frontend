import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Checkbox, Dialog } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import {
  addPlayer,
  clearPlayerTextures,
  deletePlayer,
  fetchPlayers,
  renamePlayer,
  type PlayerRow,
} from '../../api/user'
import { fetchTexture } from '../../api/skinlib'
import { textureUrl } from '../../lib/texture'
import {
  DEFAULT_PLAYER_NAME_MAX,
  DEFAULT_PLAYER_NAME_MIN,
  validatePlayerName,
} from '../../lib/player'
import { PromptDialog } from '../../components/PromptDialog'
import { tWithParams } from '../../lib/i18n'
import { toast } from '../../lib/toast'

const TexturePreview3D = lazy(() => import('../../components/TexturePreview3D'))

/** `/user/player`：角色列表、改名、删除、清除材质与 3D 预览。 */
export function PlayersPage() {
  const { http, bootstrap, refreshBootstrap } = useApp()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [selectedPid, setSelectedPid] = useState(0)
  const [search, setSearch] = useState('')
  const [addVisible, setAddVisible] = useState(false)
  const [renameTarget, setRenameTarget] = useState<PlayerRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlayerRow | null>(null)
  const [clearTarget, setClearTarget] = useState<PlayerRow | null>(null)
  const [clearSkin, setClearSkin] = useState(true)
  const [clearCape, setClearCape] = useState(true)
  const [busy, setBusy] = useState(false)

  const players = useQuery({
    queryKey: ['players'],
    queryFn: () => fetchPlayers(http),
  })

  useEffect(() => {
    if (selectedPid === 0 && players.data?.length === 1) {
      setSelectedPid(players.data[0]!.pid)
    }
  }, [players.data, selectedPid])

  const list = players.data ?? []
  const selected = list.find((player) => player.pid === selectedPid) ?? null
  const keyword = search.trim().toLowerCase()
  const visiblePlayers = keyword
    ? list.filter((player) => player.name.toLowerCase().includes(keyword))
    : list

  const skinInfo = useQuery({
    queryKey: ['texture', selected?.tid_skin ?? 0],
    queryFn: () => fetchTexture(http, selected?.tid_skin ?? 0),
    enabled: (selected?.tid_skin ?? 0) > 0,
  })
  const capeInfo = useQuery({
    queryKey: ['texture', selected?.tid_cape ?? 0],
    queryFn: () => fetchTexture(http, selected?.tid_cape ?? 0),
    enabled: (selected?.tid_cape ?? 0) > 0,
  })

  const options = bootstrap.options
  const rules = {
    rule: String(options.player_name_rule ?? 'official'),
    regexp: String(options.custom_player_name_regexp ?? ''),
    min: DEFAULT_PLAYER_NAME_MIN,
    max: DEFAULT_PLAYER_NAME_MAX,
  }
  const cost = Number(options.score_per_player ?? 100)

  function nameError(value: string): string | undefined {
    const error = validatePlayerName(value, rules)
    if (!error) {
      return undefined
    }
    if (error === 'empty') {
      return t('user.emptyPlayerName', '角色名不能为空')
    }
    if (error === 'length') {
      return tWithParams(
        t,
        'user.player.player-name-length',
        { min: rules.min, max: rules.max },
        `角色名最少 ${rules.min} 个字符，最多 ${rules.max} 个字符`,
      )
    }
    if (error === 'regexp') {
      return t('user.player.player-name-rule.custom', '角色名不符合站点规则')
    }
    return t(`user.player.player-name-rule.${rules.rule}`, '角色名不符合站点规则')
  }

  async function afterMutation() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['players'] }),
      refreshBootstrap(),
    ])
  }

  async function confirmAdd(name: string) {
    setBusy(true)
    try {
      const result = await addPlayer(http, name)
      if (result.code === 0) {
        toast.success(result.message)
        setAddVisible(false)
        if (result.data) {
          setSelectedPid(result.data.pid)
        }
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

  async function confirmRename(name: string) {
    if (!renameTarget) {
      return
    }
    setBusy(true)
    try {
      const result = await renamePlayer(http, renameTarget.pid, name)
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

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }
    setBusy(true)
    try {
      const result = await deletePlayer(http, deleteTarget.pid)
      if (result.code === 0) {
        toast.success(result.message)
        if (selectedPid === deleteTarget.pid) {
          setSelectedPid(0)
        }
        setDeleteTarget(null)
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

  async function confirmClear() {
    if (!clearTarget) {
      return
    }
    const types: Array<'skin' | 'cape'> = []
    if (clearSkin) {
      types.push('skin')
    }
    if (clearCape) {
      types.push('cape')
    }
    if (types.length === 0) {
      toast.warning(t('user.noClearChoice', '请选择要清除的材质'))
      return
    }
    setBusy(true)
    try {
      const result = await clearPlayerTextures(http, clearTarget.pid, types)
      if (result.code === 0) {
        toast.success(result.message)
        setClearTarget(null)
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

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{t('general.player-manage', '角色管理')}</h1>
        <span className="user-page-subtitle">
          {t('user.player.add-player', '添加新角色')}：{cost} {t('general.score', '积分')} / 个
        </span>
      </header>

      {players.isError ? (
        <p className="user-empty">{normalizeApiError(players.error).message}</p>
      ) : null}

      <div className="user-grid user-grid-player">
        <div className="user-card">
          <div className="user-card-header user-card-header-split">
            <input
              className="user-search"
              type="search"
              value={search}
              placeholder={t('user.typeToSearch', '输入即搜索')}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button theme="primary" onClick={() => setAddVisible(true)}>
              {t('user.player.add-player', '添加新角色')}
            </Button>
          </div>
          <div className="user-card-body user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>PID</th>
                  <th>{t('general.player.player-name', '角色名')}</th>
                  <th style={{ width: '220px' }}>{t('user.player.operation', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="user-table-empty">
                      {players.isPending ? '加载中…' : t('general.noResult', '没有结果')}
                    </td>
                  </tr>
                ) : (
                  visiblePlayers.map((player) => (
                    <tr
                      key={player.pid}
                      className={player.pid === selectedPid ? 'is-selected' : undefined}
                      onClick={() => setSelectedPid(player.pid)}
                    >
                      <td>{player.pid}</td>
                      <td>
                        <span>{player.name}</span>
                        <button
                          type="button"
                          className="user-link user-link-inline"
                          onClick={(event) => {
                            event.stopPropagation()
                            setRenameTarget(player)
                          }}
                        >
                          {t('user.player.edit-pname', '修改角色名')}
                        </button>
                      </td>
                      <td>
                        <div className="user-inline-actions">
                          <Button
                            size="small"
                            theme="warning"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              setClearSkin(true)
                              setClearCape(true)
                              setClearTarget(player)
                            }}
                          >
                            {t('user.player.delete-texture', '删除材质')}
                          </Button>
                          <Button
                            size="small"
                            theme="danger"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeleteTarget(player)
                            }}
                          >
                            {t('user.player.delete-player', '删除角色')}
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

        <div className="user-card user-preview-card">
          <div className="user-card-header">
            <h2>{t('general.player.player-name', '角色名')}</h2>
          </div>
          <div className="user-card-body user-preview-body">
            {selected ? (
              <Suspense fallback={<div className="texture-preview-loading">加载 3D 预览…</div>}>
                <TexturePreview3D
                  skin={skinInfo.data ? textureUrl(skinInfo.data.hash) : undefined}
                  cape={capeInfo.data ? textureUrl(capeInfo.data.hash) : undefined}
                  slim={skinInfo.data?.type === 'alex'}
                />
              </Suspense>
            ) : (
              <p className="user-empty">{t('user.closet.use-as.empty', '你好像还没有添加任何角色哦')}</p>
            )}
          </div>
        </div>
      </div>

      <PromptDialog
        visible={addVisible}
        title={t('user.player.add-player', '添加新角色')}
        description={
          <span>
            {t('user.player.player-name-rule.' + rules.rule, '角色名规则')}
            <br />
            {tWithParams(
              t,
              'user.player.player-name-length',
              { min: rules.min, max: rules.max },
              `角色名最少 ${rules.min} 个字符，最多 ${rules.max} 个字符`,
            )}
            <br />
            {`${t('user.player.add-player', '添加新角色')}：${cost} ${t('general.score', '积分')}`}
          </span>
        }
        confirmText={t('general.submit', '提交')}
        busy={busy}
        validator={nameError}
        onCancel={() => setAddVisible(false)}
        onConfirm={(value) => void confirmAdd(value.trim())}
      />

      <PromptDialog
        visible={renameTarget !== null}
        title={t('user.changePlayerNameNotice', '请输入新的角色名：')}
        defaultValue={renameTarget?.name ?? ''}
        confirmText={t('general.submit', '提交')}
        busy={busy}
        validator={nameError}
        onCancel={() => setRenameTarget(null)}
        onConfirm={(value) => void confirmRename(value.trim())}
      />

      <Dialog
        visible={clearTarget !== null}
        header={t('user.player.delete-texture', '删除材质')}
        cancelBtn={{ content: '取消', disabled: busy }}
        confirmBtn={{ content: '确定', theme: 'danger', loading: busy }}
        onClose={() => setClearTarget(null)}
        onCancel={() => setClearTarget(null)}
        onConfirm={() => void confirmClear()}
      >
        <p>{t('user.chooseClearTexture', '请选择要清除的材质：')}</p>
        <div className="user-checkboxes">
          <Checkbox checked={clearSkin} onChange={(checked) => setClearSkin(Boolean(checked))}>
            {t('general.skin', '皮肤')}
          </Checkbox>
          <Checkbox checked={clearCape} onChange={(checked) => setClearCape(Boolean(checked))}>
            {t('general.cape', '披风')}
          </Checkbox>
        </div>
      </Dialog>

      <Dialog
        visible={deleteTarget !== null}
        header={t('user.deletePlayer', '删除角色')}
        cancelBtn={{ content: '取消', disabled: busy }}
        confirmBtn={{ content: '删除', theme: 'danger', loading: busy }}
        onClose={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      >
        <p>{t('user.deletePlayerNotice', '删除后无法恢复，确定要继续吗？')}</p>
      </Dialog>
    </section>
  )
}
