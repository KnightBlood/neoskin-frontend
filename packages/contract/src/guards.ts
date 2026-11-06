import { CONTRACT_VERSION, type BootstrapPayload } from './types'

/** bootstrap/contract 校验失败时抛出，调用方应回退 legacy 或展示错误页。 */
export class ContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractError'
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  if (typeof value !== 'string') {
    throw new ContractError(`bootstrap.${key} 必须是字符串`)
  }
  return value
}

function requireBoolean(source: Record<string, unknown>, key: string, path: string): boolean {
  const value = source[key]
  if (typeof value !== 'boolean') {
    throw new ContractError(`${path}.${key} 必须是布尔值`)
  }
  return value
}

function requireArray(source: Record<string, unknown>, key: string, path: string): unknown[] {
  const value = source[key]
  if (!Array.isArray(value)) {
    throw new ContractError(`${path}.${key} 必须是数组`)
  }
  return value
}

function assertUser(value: unknown): void {
  if (value === null) {
    return
  }
  if (!isRecord(value)) {
    throw new ContractError('bootstrap.user 必须是对象或 null')
  }
  for (const key of ['uid', 'email', 'nickname', 'avatar', 'score', 'permission']) {
    if (value[key] === undefined || value[key] === null) {
      throw new ContractError(`bootstrap.user.${key} 缺失`)
    }
  }
  for (const key of ['verified', 'isAdmin', 'isBanned', 'darkMode']) {
    requireBoolean(value, key, 'bootstrap.user')
  }
}

function assertFeatures(value: unknown): void {
  if (!isRecord(value)) {
    throw new ContractError('bootstrap.features 必须是对象')
  }
  for (const key of ['registration', 'emailVerification', 'passwordReset', 'oauth', 'reports', 'plugins']) {
    requireBoolean(value, key, 'bootstrap.features')
  }
}

function assertPlugins(value: unknown): void {
  if (!isRecord(value)) {
    throw new ContractError('bootstrap.plugins 必须是对象')
  }
  requireArray(value, 'menus', 'bootstrap.plugins')
  requireArray(value, 'badges', 'bootstrap.plugins')
  requireArray(value, 'styles', 'bootstrap.plugins')
  requireArray(value, 'scripts', 'bootstrap.plugins')
}

/** 运行时校验 bootstrap payload；失败抛 ContractError。 */
export function assertBootstrap(value: unknown): BootstrapPayload {
  if (!isRecord(value)) {
    throw new ContractError('bootstrap 必须是 JSON 对象')
  }
  const contractVersion = value.contractVersion
  if (typeof contractVersion !== 'number') {
    throw new ContractError('bootstrap.contractVersion 必须是数字')
  }
  if (contractVersion !== CONTRACT_VERSION) {
    throw new ContractError(
      `契约版本不匹配：后端 ${contractVersion}，前端支持 ${CONTRACT_VERSION}`,
    )
  }
  for (const key of ['apiBase', 'locale', 'localeFallback', 'siteName', 'version', 'basePath', 'mode', 'csrfToken']) {
    requireString(value, key)
  }
  const mode = value.mode
  if (mode !== 'site' && mode !== 'admin') {
    throw new ContractError('bootstrap.mode 必须是 site 或 admin')
  }
  assertUser(value.user)
  if (!isRecord(value.options)) {
    throw new ContractError('bootstrap.options 必须是对象')
  }
  assertFeatures(value.features)
  assertPlugins(value.plugins)
  return value as unknown as BootstrapPayload
}

/** 解析 JSON 字符串并校验；失败抛 ContractError。 */
export function parseBootstrap(raw: string): BootstrapPayload {
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch (error) {
    throw new ContractError(`bootstrap JSON 解析失败：${(error as Error).message}`)
  }
  return assertBootstrap(decoded)
}

/** 显式断言契约版本（调用方自定义期望版本时使用）。 */
export function assertContractVersion(
  payload: Pick<BootstrapPayload, 'contractVersion'>,
  expected: number = CONTRACT_VERSION,
): void {
  if (payload.contractVersion !== expected) {
    throw new ContractError(
      `契约版本不匹配：后端 ${payload.contractVersion}，期望 ${expected}`,
    )
  }
}
