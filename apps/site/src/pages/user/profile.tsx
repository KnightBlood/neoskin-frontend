import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, Input } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../../app/context'
import { resetAvatar, updateProfile } from '../../api/user'
import { tWithParams } from '../../lib/i18n'
import { toast } from '../../lib/toast'

function goToLogin(basePath: string) {
  window.setTimeout(() => window.location.assign(`${basePath}auth/login`), 900)
}

/** `/user/profile`：头像、昵称、密码、邮箱与注销账号。 */
export function ProfilePage() {
  const { http, bootstrap, updateUser } = useApp()
  const { t } = useTranslation()
  const user = bootstrap.user

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailPassword, setEmailPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteVisible, setDeleteVisible] = useState(false)
  const [resetVisible, setResetVisible] = useState(false)
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  if (!user) {
    return null
  }

  const avatarSrc = avatarVersion > 0 ? `${user.avatar}?v=${avatarVersion}` : user.avatar

  async function submitNickname() {
    if (!nickname.trim()) {
      toast.warning(t('user.profile.nickname.empty', '昵称不能为空'))
      return
    }
    setBusy('nickname')
    try {
      const result = await updateProfile(http, 'nickname', { new_nickname: nickname.trim() })
      if (result.code === 0) {
        toast.success(result.message)
        updateUser({ nickname: nickname.trim() })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(null)
    }
  }

  async function submitPassword() {
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.invalidConfirmPwd', '两次输入的密码不一致'))
      return
    }
    setBusy('password')
    try {
      const result = await updateProfile(http, 'password', {
        current_password: oldPassword,
        new_password: newPassword,
      })
      if (result.code === 0) {
        toast.success(result.message)
        goToLogin(bootstrap.basePath)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(null)
    }
  }

  async function submitEmail() {
    setBusy('email')
    try {
      const result = await updateProfile(http, 'email', { email, password: emailPassword })
      if (result.code === 0) {
        toast.success(result.message)
        goToLogin(bootstrap.basePath)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(null)
    }
  }

  async function confirmResetAvatar() {
    setBusy('avatar')
    try {
      const result = await resetAvatar(http)
      if (result.code === 0) {
        toast.success(result.message)
        setResetVisible(false)
        setAvatarVersion(Date.now())
        updateUser({ avatar: '/avatar/0' })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(null)
    }
  }

  async function confirmDelete() {
    setBusy('delete')
    try {
      const result = await updateProfile(http, 'delete', { password: deletePassword })
      if (result.code === 0) {
        toast.success(result.message)
        window.setTimeout(() => window.location.assign(bootstrap.basePath), 900)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="user-page">
      <header className="user-page-header">
        <h1>{t('general.profile', '个人资料')}</h1>
      </header>

      <div className="user-grid user-grid-2">
        <article className="user-card">
          <div className="user-card-header">
            <h2>{t('user.profile.avatar.title', '更改头像？')}</h2>
          </div>
          <div className="user-card-body user-avatar-body">
            <img className="user-avatar-preview" src={avatarSrc} alt={user.nickname} width={96} height={96} />
            <p className="user-muted">{t('user.profile.avatar.notice', '在衣柜中点击「设为头像」即可自动截取皮肤头部。')}</p>
          </div>
          <div className="user-card-footer">
            <Button variant="outline" onClick={() => setResetVisible(true)}>
              {t('user.profile.avatar.reset', '重置头像')}
            </Button>
          </div>
        </article>

        <article className="user-card">
          <div className="user-card-header">
            <h2>{t('user.profile.nickname.title', '更改昵称')}</h2>
          </div>
          <form
            className="user-card-body user-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submitNickname()
            }}
          >
            <Input
              value={nickname}
              placeholder={t('user.profile.nickname.title', '更改昵称')}
              onChange={(next) => setNickname(String(next))}
            />
          </form>
          <div className="user-card-footer">
            <Button theme="primary" loading={busy === 'nickname'} onClick={() => void submitNickname()}>
              {t('general.submit', '提交')}
            </Button>
          </div>
        </article>

        <article className="user-card">
          <div className="user-card-header">
            <h2>{t('user.profile.password.title', '更改密码')}</h2>
          </div>
          <form
            className="user-card-body user-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submitPassword()
            }}
          >
            <label className="user-field">
              <span>{t('user.profile.password.old', '原密码')}</span>
              <Input
                type="password"
                value={oldPassword}
                onChange={(next) => setOldPassword(String(next))}
              />
            </label>
            <label className="user-field">
              <span>{t('user.profile.password.new', '新密码')}</span>
              <Input
                type="password"
                value={newPassword}
                onChange={(next) => setNewPassword(String(next))}
              />
            </label>
            <label className="user-field">
              <span>{t('user.profile.password.confirm', '确认密码')}</span>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(next) => setConfirmPassword(String(next))}
              />
            </label>
          </form>
          <div className="user-card-footer">
            <Button theme="primary" loading={busy === 'password'} onClick={() => void submitPassword()}>
              {t('user.profile.password.button', '修改密码')}
            </Button>
          </div>
        </article>

        <article className="user-card">
          <div className="user-card-header">
            <h2>{t('user.profile.email.title', '更改邮箱')}</h2>
          </div>
          <form
            className="user-card-body user-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submitEmail()
            }}
          >
            <label className="user-field">
              <span>{t('user.profile.email.new', '新邮箱')}</span>
              <Input value={email} onChange={(next) => setEmail(String(next))} />
            </label>
            <label className="user-field">
              <span>{t('user.profile.email.password', '当前密码')}</span>
              <Input
                type="password"
                value={emailPassword}
                onChange={(next) => setEmailPassword(String(next))}
              />
            </label>
          </form>
          <div className="user-card-footer">
            <Button theme="primary" loading={busy === 'email'} onClick={() => void submitEmail()}>
              {t('user.profile.email.button', '修改邮箱')}
            </Button>
          </div>
        </article>

        <article className="user-card user-card-danger">
          <div className="user-card-header">
            <h2>{t('user.profile.delete.title', '删除账号')}</h2>
          </div>
          <div className="user-card-body">
            <p className="user-muted">
              {user.isAdmin
                ? t('user.profile.delete.admin', '拥有管理员权限的账号不能被删除')
                : tWithParams(
                    t,
                    'user.profile.delete.notice',
                    { site: bootstrap.siteName },
                    '确定要删除你的账号吗？',
                  )}
            </p>
          </div>
          <div className="user-card-footer">
            <Button
              theme="danger"
              variant="outline"
              disabled={user.isAdmin}
              onClick={() => setDeleteVisible(true)}
            >
              {t('user.profile.delete.button', '删除我的账号')}
            </Button>
          </div>
        </article>
      </div>

      <Dialog
        visible={resetVisible}
        header={t('user.profile.avatar.reset', '重置头像')}
        cancelBtn={{ content: '取消' }}
        confirmBtn={{ content: '确定', theme: 'primary', loading: busy === 'avatar' }}
        onClose={() => setResetVisible(false)}
        onCancel={() => setResetVisible(false)}
        onConfirm={() => void confirmResetAvatar()}
      >
        <p>确定要将头像重置为默认头像吗？</p>
      </Dialog>

      <Dialog
        visible={deleteVisible}
        header={t('user.profile.delete.modal-title', '这是危险操作，输入密码以继续')}
        theme="danger"
        cancelBtn={{ content: t('general.close', '关闭') }}
        confirmBtn={{ content: t('general.submit', '提交'), theme: 'danger', loading: busy === 'delete' }}
        onClose={() => setDeleteVisible(false)}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={() => void confirmDelete()}
      >
        <p className="user-danger-text">
          {t('user.profile.delete.modal-notice', '此操作不可恢复！')}
        </p>
        <Input
          type="password"
          value={deletePassword}
          placeholder={t('user.profile.delete.password', '当前密码')}
          onChange={(next) => setDeletePassword(String(next))}
        />
      </Dialog>
    </section>
  )
}
