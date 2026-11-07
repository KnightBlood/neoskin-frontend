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

// --- 用户中心（P3）：新增契约端点必须存在（匿名 401） ---
for (const path of ['/api/user/inbox', '/api/user/reports']) {
  const response = await get(path)
  assert.equal(response.status, 401, `${path} 匿名请求需要 401`)
  assert.match(
    response.headers.get('content-type') ?? '',
    /^application\/json/,
    `${path} Content-Type 需要 application/json`,
  )
}

// --- 皮肤库（P2）：列表 + 详情 + 预览 ---
const listResponse = await get('/skinlib/list?filter=skin&sort=time&page=1')
assert.equal(listResponse.status, 200, '/skinlib/list 需要 200')
assert.match(
  listResponse.headers.get('content-type') ?? '',
  /^application\/json/,
  '/skinlib/list Content-Type 需要 application/json',
)
const page = await listResponse.json()
assert.ok(Array.isArray(page.data), '/skinlib/list data 必须是数组')
assert.equal(typeof page.current_page, 'number', '/skinlib/list current_page 必须是数字')
assert.equal(typeof page.last_page, 'number', '/skinlib/list last_page 必须是数字')
assert.equal(typeof page.total, 'number', '/skinlib/list total 必须是数字')

for (const item of page.data.slice(0, 3)) {
  for (const key of ['tid', 'name', 'type', 'uploader', 'nickname']) {
    assert.ok(key in item, `/skinlib/list 项缺少 ${key}`)
  }
  assert.ok(['steve', 'alex', 'cape'].includes(item.type), '材质 type 非法')
  assert.equal(typeof item.likes, 'number', '/skinlib/list 项 likes 必须是数字')
  assert.equal(typeof item.public, 'boolean', '/skinlib/list 项 public 必须是布尔值')
}

const capeResponse = await get('/skinlib/list?filter=cape&sort=time&page=1')
assert.equal(capeResponse.status, 200, '/skinlib/list?filter=cape 需要 200')
const capes = await capeResponse.json()
assert.ok(Array.isArray(capes.data), '披风列表 data 必须是数组')

const sample = page.data[0] ?? capes.data[0]
if (sample) {
  const infoResponse = await get(`/skinlib/info/${sample.tid}`)
  assert.equal(infoResponse.status, 200, `/skinlib/info/${sample.tid} 需要 200`)
  const texture = await infoResponse.json()
  for (const key of ['tid', 'name', 'type', 'hash', 'public']) {
    assert.ok(key in texture, `/skinlib/info/${sample.tid} 缺少 ${key}`)
  }

  const webp = await get(`/preview/${sample.tid}?height=150`, 'image/webp')
  assert.equal(webp.status, 200, `/preview/${sample.tid} 需要 200`)
  assert.match(webp.headers.get('content-type') ?? '', /^image\//, '/preview 需要图片类型')

  const png = await get(`/preview/${sample.tid}?height=150&png=1`, 'image/png')
  assert.equal(png.status, 200, `/preview/${sample.tid}?png 需要 200`)
  assert.match(png.headers.get('content-type') ?? '', /^image\/png/, '/preview?png 必须是 PNG')

  const raw = await get(`/textures/${texture.hash}`, 'image/png')
  assert.equal(raw.status, 200, `/textures/${texture.hash} 需要 200`)
  assert.match(raw.headers.get('content-type') ?? '', /^image\/png/, '/textures/{hash} 必须是 PNG')
}

console.log(`contract check passed: ${base}`)
