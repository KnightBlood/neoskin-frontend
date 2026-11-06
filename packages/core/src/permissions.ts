import type { BootstrapUser, PluginInjection } from '@neoskin/contract'

/** 与 PHP User 常量一致。 */
export const Permission = {
  banned: -1,
  normal: 0,
  admin: 1,
  super: 2,
} as const

export type PermissionLevel = (typeof Permission)[keyof typeof Permission]

export function isAdmin(
  user: Pick<BootstrapUser, 'permission'> | null | undefined,
): boolean {
  return (user?.permission ?? Permission.banned) >= Permission.admin
}

export function isBanned(
  user: Pick<BootstrapUser, 'permission'> | null | undefined,
): boolean {
  return (user?.permission ?? Permission.normal) < Permission.normal
}

/**
 * 按顺序插入插件样式/脚本；单个资源失败不阻塞页面（CSS/JS 加载失败由浏览器处理）。
 */
export function injectPluginAssets(
  plugins: Pick<PluginInjection, 'styles' | 'scripts'>,
  documentImpl: Document = document,
): void {
  for (const href of plugins.styles ?? []) {
    if (!href) continue
    const link = documentImpl.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    documentImpl.head.appendChild(link)
  }
  for (const src of plugins.scripts ?? []) {
    if (!src) continue
    const script = documentImpl.createElement('script')
    script.src = src
    script.defer = true
    documentImpl.body.appendChild(script)
  }
}
