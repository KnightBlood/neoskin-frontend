import type { BootstrapPayload } from '@neoskin/contract'

/**
 * 站点要求邮箱验证且当前用户尚未验证。
 *
 * <p>对应 PHP 的 `verified` 中间件：未验证用户不能管理角色、上传材质、
 * 管理 OAuth2 应用；`require_verification` 关闭时不受限制。</p>
 */
export function isVerificationRequired(bootstrap: BootstrapPayload): boolean {
  const user = bootstrap.user
  if (!user || user.verified) {
    return false
  }
  return Boolean(bootstrap.options.require_verification ?? bootstrap.features.emailVerification)
}
