// 对任意后端端口执行契约冒烟：SPA 壳 + /api/bootstrap。
// 用法：node scripts/contract-check.mjs --base http://127.0.0.1:8080
import assert from 'node:assert/strict'

const args = process.argv.slice(2)
const index = args.indexOf('--base')
const base = index >= 0 ? args[index + 1] : 'http://127.0.0.1:8080'
if (!base) {
  throw new Error('--base 不能为空')
}

const get = async (path, accept = 'application/json') => {
  const response = await fetch(base + path, {
    headers: { Accept: accept, 'User-Agent': 'neoskin-contract-check' },
    redirect: 'manual',
  })
  return response
}

for (const mode of ['site', 'admin']) {
  const response = await get(`/app-next/${mode}/`, 'text/html')
  assert.equal(response.status, 200, `/app-next/${mode}/ 需要 200`)
  const html = await response.text()
  assert.ok(html.includes('neoskin-bootstrap'), `/app-next/${mode}/ 缺少 #neoskin-bootstrap`)
  assert.ok(html.includes('csrf-token'), `/app-next/${mode}/ 缺少 csrf-token meta`)
}

const bootstrapResponse = await get('/api/bootstrap')
assert.equal(bootstrapResponse.status, 200, '/api/bootstrap 需要 200')
assert.match(
  bootstrapResponse.headers.get('content-type') ?? '',
  /^application\/json/,
  '/api/bootstrap Content-Type 需要 application/json',
)
const body = await bootstrapResponse.json()
const payload = body && typeof body.code === 'number' ? body.data : body
assert.equal(payload.contractVersion, 1, 'contractVersion 必须为 1')
for (const key of ['apiBase', 'locale', 'siteName', 'version', 'basePath', 'mode']) {
  assert.equal(typeof payload[key], 'string', `bootstrap.${key} 必须是字符串`)
}
assert.ok('user' in payload, 'bootstrap.user 必须存在')
assert.ok(payload.options && typeof payload.options === 'object', 'bootstrap.options 必须是对象')
assert.ok(payload.features && typeof payload.features === 'object', 'bootstrap.features 必须是对象')
assert.ok(payload.plugins && typeof payload.plugins === 'object', 'bootstrap.plugins 必须是对象')

console.log(`contract check passed: ${base}`)
