import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Dialog } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import { fetchScoreInfo, signIn } from '../../api/user'
import { remainingParts, remainingSignMs } from '../../lib/score'
import { tWithParams } from '../../lib/i18n'
import { toast } from '../../lib/toast'

function UsageBar({
  label,
  used,
  total,
  unit,
}: {
  label: string
  used: number
  total: number
  unit: string
}) {
  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0
  return (
    <div className="usage-row">
      <div className="usage-head">
        <span>{label}</span>
        <span className="usage-number">
          <b>{Math.floor(used)}</b> / {Math.floor(total)} {unit}
        </span>
      </div>
      <div className="usage-track">
        <div className="usage-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

/** `/user`：积分、使用量、签到与邮箱验证。 */
export function UserDashboardPage() {
  const { http, bootstrap, updateUser } = useApp()
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [signing, setSigning] = useState(false)
  const [introVisible, setIntroVisible] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const info = useQuery({
    queryKey: ['user-score-info'],
    queryFn: () => fetchScoreInfo(http),
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const user = bootstrap.user
  const data = info.data
  const score = data?.user.score ?? user?.score ?? 0
  const playersUsed = data?.usage.players ?? 0
  const storageUsed = data?.usage.storage ?? 0
  const playerRate =
    data?.rate.players || Number(bootstrap.options.score_per_player ?? 100)
  const storageRate =
    data?.rate.storage || Number(bootstrap.options.score_per_storage ?? 1)

  const playersTotal = playerRate > 0 ? Math.floor(playersUsed + score / playerRate) : playersUsed
  const storageTotal = storageRate > 0 ? storageUsed + score / storageRate : storageUsed

  const remaining = data
    ? remainingSignMs(data.user.lastSignAt, data.signGapTime, data.signAfterZero, now)
    : 0
  const parts = remainingParts(remaining)
  const remainingText = tWithParams(
    t,
    'user.signRemainingTime',
    {
      time: parts.value,
      unit:
        parts.unit === 'hour'
          ? t('user.timeUnitHour', '小时')
          : t('user.timeUnitMin', '分钟'),
    },
    ':time :unit 后可签到',
  )

  const options = bootstrap.options
  const signRange = String(options.sign_score ?? '10,100').split(',')
  const returnScore =
    options.take_back_scores_after_deletion === false
      ? t('user.score-intro.no-return-score', '删除时将不会返还相应积分。')
      : t('user.score-intro.will-return-score', '删除时将返还相应积分。')
  const intro = tWithParams(
    t,
    'user.score-intro.introduction',
    {
      initial_score: String(options.user_initial_score ?? 1000),
      'score-from': signRange[0]?.trim() ?? '10',
      'score-to': signRange[1]?.trim() ?? '100',
      'return-score': returnScore,
    },
    [
      '为了防止用户滥用材质上传功能导致占用过多的存储空间，本站已启用积分系统。',
      '添加角色、上传材质，以及添加皮肤库里的材质到衣柜等操作均会消耗积分。',
      ':return-score',
      '',
      '本站用户初始积分为 :initial_score，每日签到可以随机获得 :score-from ~ :score-to 积分。',
    ].join('\n'),
  )

  async function handleSign() {
    if (signing || remaining > 0) {
      return
    }
    setSigning(true)
    try {
      const result = await signIn(http)
      if (result.code === 0) {
        toast.success(result.message || t('user.sign-success', '签到成功'))
        const next = result.data?.score ?? score
        updateUser({ score: next })
        await queryClient.invalidateQueries({ queryKey: ['user-score-info'] })
      } else if (result.code === 1) {
        toast.warning(remainingText)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setSigning(false)
    }
  }

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{t('general.dashboard', '仪表盘')}</h1>
        <span className="user-page-subtitle">
          {t('user.cur-score', '当前积分')}：{score}
        </span>
      </header>

      <div className="user-grid">
        <div className="user-card">
          <div className="user-card-header">
            <h2>{t('user.used.title', '使用量')}</h2>
          </div>
          <div className="user-card-body">
            <UsageBar
              label={t('user.used.players', '角色')}
              used={playersUsed}
              total={playersTotal}
              unit=""
            />
            {storageUsed > 1024 ? (
              <UsageBar
                label={t('user.used.storage', '存储空间')}
                used={storageUsed / 1024}
                total={storageTotal / 1024}
                unit="MB"
              />
            ) : (
              <UsageBar
                label={t('user.used.storage', '存储空间')}
                used={storageUsed}
                total={storageTotal}
                unit="KB"
              />
            )}
          </div>
          <div className="user-card-footer">
            <Button
              theme="primary"
              loading={signing}
              disabled={remaining > 0}
              onClick={() => void handleSign()}
            >
              {remaining > 0 ? remainingText : t('user.sign', '签到')}
            </Button>
          </div>
        </div>

        <div className="user-card user-score-card">
          <div className="user-card-header">
            <h2>{t('general.score', '积分')}</h2>
          </div>
          <div className="user-card-body user-score-body">
            <button
              type="button"
              className="user-score-value"
              title={t('user.score-intro.title', '积分是什么？')}
              onClick={() => setIntroVisible(true)}
            >
              {score}
            </button>
            <p className="user-score-notice">{t('user.score-notice', '点击积分可查看积分说明')}</p>
            <button type="button" className="user-link" onClick={() => setIntroVisible(true)}>
              {t('user.score-intro.title', '积分是什么？')}
            </button>
          </div>
        </div>
      </div>

      {info.isError ? (
        <p className="user-empty">{normalizeApiError(info.error).message}</p>
      ) : null}

      <Dialog
        visible={introVisible}
        header={t('user.score-intro.title', '积分是什么？')}
        footer={false}
        onClose={() => setIntroVisible(false)}
      >
        <div className="user-score-intro">{intro}</div>
        <div className="user-score-rates">
          <span>
            {tWithParams(
              t,
              'user.score-intro.rates.storage',
              { score: Number(options.score_per_storage ?? 1) },
              ':score 积分 = 1 KB 存储空间',
            )}
          </span>
          <span>
            {tWithParams(
              t,
              'user.score-intro.rates.player',
              { score: Number(options.score_per_player ?? 100) },
              ':score 积分 = 1 个角色',
            )}
          </span>
          <span>
            {tWithParams(
              t,
              'user.score-intro.rates.closet',
              { score: Number(options.score_per_closet_item ?? 0) },
              ':score 积分 = 1 个衣柜收藏',
            )}
          </span>
        </div>
      </Dialog>
    </section>
  )
}
