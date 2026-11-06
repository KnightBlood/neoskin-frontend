import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Alert, Button, Checkbox, Input } from 'tdesign-react'
import type { ApiEnvelope } from '@neoskin/contract'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'

interface FieldErrors {
  [field: string]: string[]
}

function errorOf(errors: FieldErrors, field: string): string | undefined {
  return errors[field]?.[0]
}

function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="auth-card">
      <h1>{title}</h1>
      {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
      {children}
      {footer ? <div className="auth-footer">{footer}</div> : null}
    </section>
  )
}

function CaptchaField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const [nonce, setNonce] = useState(0)
  return (
    <div className="auth-captcha">
      <Input
        name="captcha"
        placeholder="验证码"
        value={value}
        status={error ? 'error' : undefined}
        onChange={(next) => onChange(String(next))}
      />
      <button
        type="button"
        className="auth-captcha-image"
        title="点击刷新验证码"
        onClick={() => setNonce((current) => current + 1)}
      >
        <img src={`/auth/captcha?t=${nonce}`} alt="验证码" />
      </button>
    </div>
  )
}

const captchaEnabled = (options: Record<string, unknown>) =>
  options.captcha === true || options.recaptcha === true

export function LoginPage() {
  const { http, bootstrap } = useApp()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [identification, setIdentification] = useState('')
  const [password, setPassword] = useState('')
  const [keep, setKeep] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const showCaptcha = useMemo(() => captchaEnabled(bootstrap.options), [bootstrap.options])

  if (bootstrap.user) {
    return <Navigate to="/user" replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setErrors({})
    try {
      const result = await http.post<ApiEnvelope<{ redirectTo?: string }>>('/auth/login', {
        identification,
        password,
        keep,
        captcha,
      })
      if (result.code !== 0) {
        setMessage(result.message)
        return
      }
      const redirect = search.get('redirect')
      const internal = redirect || result.data?.redirectTo || '/user'
      // redirectTo 在不同端口可能返回相对路径或绝对 URL。
      let path = internal
      if (/^https?:\/\//.test(path)) {
        try {
          path = new URL(path).pathname
        } catch {
          path = '/user'
        }
      }
      const base = bootstrap.basePath.replace(/\/+$/, '')
      const target = path.startsWith('/app-next/')
        ? path
        : path.startsWith('/')
          ? base + path
          : `${base}/${path}`
      // 登录态写在会话里，必须重新加载壳以刷新 bootstrap。
      window.location.assign(target)
    } catch (error) {
      const normalized = normalizeApiError(error)
      setMessage(normalized.message)
      setErrors(normalized.errors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="登录"
      subtitle={`欢迎回到 ${bootstrap.siteName}`}
      footer={
        <>
          还没有账号？<Link to="/auth/register">立即注册</Link>
          {bootstrap.features.passwordReset ? (
            <>
              {' · '}
              <Link to="/auth/forgot">忘记密码</Link>
            </>
          ) : null}
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        {message ? <Alert theme="error" message={message} /> : null}
        <label className="auth-field">
          <span>邮箱或角色名</span>
          <Input
            name="identification"
            value={identification}
            status={errorOf(errors, 'identification') ? 'error' : undefined}
            onChange={(next) => setIdentification(String(next))}
          />
          {errorOf(errors, 'identification') ? (
            <em>{errorOf(errors, 'identification')}</em>
          ) : null}
        </label>
        <label className="auth-field">
          <span>密码</span>
          <Input
            name="password"
            type="password"
            value={password}
            status={errorOf(errors, 'password') ? 'error' : undefined}
            onChange={(next) => setPassword(String(next))}
          />
          {errorOf(errors, 'password') ? <em>{errorOf(errors, 'password')}</em> : null}
        </label>
        {showCaptcha ? (
          <label className="auth-field">
            <span>验证码</span>
            <CaptchaField
              value={captcha}
              onChange={setCaptcha}
              error={errorOf(errors, 'captcha')}
            />
            {errorOf(errors, 'captcha') ? <em>{errorOf(errors, 'captcha')}</em> : null}
          </label>
        ) : null}
        <Checkbox checked={keep} onChange={(checked) => setKeep(Boolean(checked))}>
          记住我
        </Checkbox>
        <Button type="submit" theme="primary" block loading={submitting}>
          登录
        </Button>
      </form>
    </AuthCard>
  )
}

export function RegisterPage() {
  const { http, bootstrap } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    nickname: '',
    player_name: '',
    password: '',
    confirm: '',
    captcha: '',
  })
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const withPlayerName = bootstrap.options.register_with_player_name !== false
  const showCaptcha = captchaEnabled(bootstrap.options)

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setErrors({})
    try {
      if (form.password !== form.confirm) {
        setMessage('两次输入的密码不一致。')
        return
      }
      const payload: Record<string, unknown> = {
        email: form.email,
        password: form.password,
        captcha: form.captcha,
      }
      if (withPlayerName) {
        payload.player_name = form.player_name
      } else {
        payload.nickname = form.nickname
      }
      const result = await http.post<ApiEnvelope>('/auth/register', payload)
      if (result.code !== 0) {
        setMessage(result.message)
        return
      }
      navigate('/auth/login', { replace: true })
    } catch (error) {
      const normalized = normalizeApiError(error)
      setMessage(normalized.message)
      setErrors(normalized.errors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  if (!bootstrap.features.registration) {
    return (
      <AuthCard title="注册已关闭" footer={<Link to="/auth/login">返回登录</Link>}>
        <Alert theme="warning" message="站点当前未开放注册。" />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="注册"
      subtitle={bootstrap.siteName}
      footer={
        <>
          已有账号？<Link to="/auth/login">去登录</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        {message ? <Alert theme="error" message={message} /> : null}
        <label className="auth-field">
          <span>邮箱</span>
          <Input
            name="email"
            type="text"
            value={form.email}
            status={errorOf(errors, 'email') ? 'error' : undefined}
            onChange={(next) => update('email', String(next))}
          />
          {errorOf(errors, 'email') ? <em>{errorOf(errors, 'email')}</em> : null}
        </label>
        {withPlayerName ? (
          <label className="auth-field">
            <span>角色名</span>
            <Input
              name="player_name"
              value={form.player_name}
              status={errorOf(errors, 'player_name') ? 'error' : undefined}
              onChange={(next) => update('player_name', String(next))}
            />
            {errorOf(errors, 'player_name') ? <em>{errorOf(errors, 'player_name')}</em> : null}
          </label>
        ) : (
          <label className="auth-field">
            <span>昵称</span>
            <Input
              name="nickname"
              value={form.nickname}
              status={errorOf(errors, 'nickname') ? 'error' : undefined}
              onChange={(next) => update('nickname', String(next))}
            />
            {errorOf(errors, 'nickname') ? <em>{errorOf(errors, 'nickname')}</em> : null}
          </label>
        )}
        <label className="auth-field">
          <span>密码</span>
          <Input
            name="password"
            type="password"
            value={form.password}
            status={errorOf(errors, 'password') ? 'error' : undefined}
            onChange={(next) => update('password', String(next))}
          />
          {errorOf(errors, 'password') ? <em>{errorOf(errors, 'password')}</em> : null}
        </label>
        <label className="auth-field">
          <span>确认密码</span>
          <Input
            name="password_confirmation"
            type="password"
            value={form.confirm}
            onChange={(next) => update('confirm', String(next))}
          />
        </label>
        {showCaptcha ? (
          <label className="auth-field">
            <span>验证码</span>
            <CaptchaField
              value={form.captcha}
              onChange={(value) => update('captcha', value)}
              error={errorOf(errors, 'captcha')}
            />
            {errorOf(errors, 'captcha') ? <em>{errorOf(errors, 'captcha')}</em> : null}
          </label>
        ) : null}
        <Button type="submit" theme="primary" block loading={submitting}>
          注册
        </Button>
      </form>
    </AuthCard>
  )
}

export function ForgotPage() {
  const { http, bootstrap } = useApp()
  const [email, setEmail] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [message, setMessage] = useState('')
  const [tone, setTone] = useState<'success' | 'error'>('success')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const showCaptcha = captchaEnabled(bootstrap.options)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setErrors({})
    try {
      const result = await http.post<ApiEnvelope>('/auth/forgot', { email, captcha })
      setTone(result.code === 0 ? 'success' : 'error')
      setMessage(result.message)
    } catch (error) {
      const normalized = normalizeApiError(error)
      setTone('error')
      setMessage(normalized.message)
      setErrors(normalized.errors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  if (!bootstrap.features.passwordReset) {
    return (
      <AuthCard title="找回密码不可用" footer={<Link to="/auth/login">返回登录</Link>}>
        <Alert theme="warning" message="站点未配置邮件服务，暂时无法找回密码。" />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="找回密码"
      subtitle="我们会把重置链接发送到你的邮箱"
      footer={<Link to="/auth/login">返回登录</Link>}
    >
      <form className="auth-form" onSubmit={submit}>
        {message ? <Alert theme={tone} message={message} /> : null}
        <label className="auth-field">
          <span>邮箱</span>
          <Input
            name="email"
            type="text"
            value={email}
            status={errorOf(errors, 'email') ? 'error' : undefined}
            onChange={(next) => setEmail(String(next))}
          />
          {errorOf(errors, 'email') ? <em>{errorOf(errors, 'email')}</em> : null}
        </label>
        {showCaptcha ? (
          <label className="auth-field">
            <span>验证码</span>
            <CaptchaField
              value={captcha}
              onChange={setCaptcha}
              error={errorOf(errors, 'captcha')}
            />
            {errorOf(errors, 'captcha') ? <em>{errorOf(errors, 'captcha')}</em> : null}
          </label>
        ) : null}
        <Button type="submit" theme="primary" block loading={submitting}>
          发送重置链接
        </Button>
      </form>
    </AuthCard>
  )
}

export function ResetPage() {
  const { http } = useApp()
  const navigate = useNavigate()
  const { uid } = useParams()
  const [search] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setErrors({})
    try {
      if (password !== confirm) {
        setMessage('两次输入的密码不一致。')
        return
      }
      const query = search.toString()
      const url = `/auth/reset/${uid}${query ? `?${query}` : ''}`
      const result = await http.post<ApiEnvelope>(url, { password })
      if (result.code !== 0) {
        setMessage(result.message)
        return
      }
      navigate('/auth/login', { replace: true })
    } catch (error) {
      const normalized = normalizeApiError(error)
      setMessage(normalized.message)
      setErrors(normalized.errors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="重置密码" footer={<Link to="/auth/login">返回登录</Link>}>
      <form className="auth-form" onSubmit={submit}>
        {message ? <Alert theme="error" message={message} /> : null}
        <label className="auth-field">
          <span>新密码</span>
          <Input
            name="password"
            type="password"
            value={password}
            status={errorOf(errors, 'password') ? 'error' : undefined}
            onChange={(next) => setPassword(String(next))}
          />
          {errorOf(errors, 'password') ? <em>{errorOf(errors, 'password')}</em> : null}
        </label>
        <label className="auth-field">
          <span>确认新密码</span>
          <Input
            name="password_confirmation"
            type="password"
            value={confirm}
            onChange={(next) => setConfirm(String(next))}
          />
        </label>
        <Button type="submit" theme="primary" block loading={submitting}>
          重置密码
        </Button>
      </form>
    </AuthCard>
  )
}
