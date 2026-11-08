import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'tdesign-react'
import { normalizeApiError } from '@neoskin/core'
import { useApp } from '../app/context'
import { sendVerificationEmail } from '../api/user'
import { isVerificationRequired } from '../lib/verification'
import { toast } from '../lib/toast'

/**
 * 未验证邮箱提示条：用户中心与上传页共用。
 *
 * <p>按钮调用 `POST /user/email-verification`，成功后后端会向当前邮箱发送验证链接。</p>
 */
export function VerificationNotice({ className }: { className?: string }) {
  const { http, bootstrap } = useApp()
  const { t } = useTranslation()
  const [sending, setSending] = useState(false)

  if (!isVerificationRequired(bootstrap)) {
    return null
  }

  async function send() {
    setSending(true)
    try {
      const result = await sendVerificationEmail(http)
      if (result.code === 0) {
        toast.success(result.message || t('user.verification.sent', '验证邮件已发送，请查收。'))
      } else {
        toast.error(result.message || t('user.verification.failed', '验证邮件发送失败'))
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={className ? `user-banner user-banner-warning ${className}` : 'user-banner user-banner-warning'}>
      <span>{t('auth.check.verified', '请先验证邮箱后再使用完整功能。')}</span>
      <Button theme="warning" variant="outline" loading={sending} onClick={() => void send()}>
        {t('user.verification.send', '发送验证邮件')}
      </Button>
    </div>
  )
}
