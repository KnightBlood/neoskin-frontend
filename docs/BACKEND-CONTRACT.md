# 后端契约 v1（BACKEND CONTRACT）

> 适用范围：`NeoSkinGo`、`NeoSkin.NET`、`NeoSkinSpringBoot`、`NeoSkinRS`
> 以及后续任何 Blessing Skin 6.0.11 移植端口。
>
> 前端（`apps/site`、`apps/admin`）**只**依赖本文件。任何字段、状态码、路径变化
> 都必须先改本文件并升 `contractVersion`，再改前端。
>
> 基线：`blessing-skin-server-Laravel13` 6.0.11_patch。原文契约（174 路由 / 17 表）
> 不变；本文件只补充 SPA 必需的壳与查询端点。

---

## 1. 总则

| 项 | 约定 |
| --- | --- |
| 契约版本 | `contractVersion = 1` |
| 字符集 | UTF-8 |
| JSON | `Content-Type: application/json`（**不带** `charset`） |
| 时间 | `YYYY-MM-DD HH:mm:ss`（站点时区，默认 `Asia/Shanghai`） |
| 布尔 | JSON `true/false`；数据库 0/1 由后端转换 |
| 空值 | `null`，不用空字符串代替 |
| 路径参数 | 与 PHP 版一致（`{tid}`、`{uid}`、`{player}` 等） |
| 认证 | 同源 Session Cookie（默认）；`/api/*` 同时接受 Bearer |
| CSRF | 写方法（POST/PUT/PATCH/DELETE）要求 `X-CSRF-TOKEN` 或 `_token` |

`/api/*` 不校验 CSRF（与 Laravel `api` 中间件组一致），但 SPA **仍然发送**
`X-CSRF-TOKEN`，便于后端未来收紧。

---

## 2. 部署拓扑

```text
浏览器
  │  GET /app-next/site/*      ──► 端口：返回 index.html（注入 bootstrap）
  │  GET /app-next/admin/*     ──► 端口：返回 index.html（注入 bootstrap）
  │  GET /app-next/site/assets/* ─► 静态文件（端口或 CDN）
  │  /api/*, /skinlib/list, …  ──► 端口：既有 PHP 兼容 JSON
  │  POST /auth/login, …       ──► 端口：既有写端点
```

允许两种托管方式：

1. **端口托管**（默认）：静态文件由端口提供，壳由端口模板渲染。
2. **CDN/静态托管**：`index.html` 由端口渲染（仍需注入 bootstrap），
   或完全静态 + `GET /api/bootstrap` 回退（需同源或 CORS + `credentials`）。

无论哪种方式，前端都从 `#neoskin-bootstrap` 读取配置，缺失时请求
`/api/bootstrap`。

---

## 3. SPA 壳

### 3.1 路由

| 方法 | 路径 | 返回 |
| --- | --- | --- |
| GET | `/app-next/site`、`/app-next/site/` | site `index.html` |
| GET | `/app-next/site/{path...}` | site `index.html`（非静态资源时） |
| GET | `/app-next/admin`、`/app-next/admin/` | admin `index.html` |
| GET | `/app-next/admin/{path...}` | admin `index.html`（非静态资源时） |

- 已有扩展名的静态文件（`.js`、`.css`、`.woff2`、`.png`、`.svg` 等）**不得**回退 HTML，
  缺失应返回 404。
- 壳本身不要求登录；未登录由前端根据 `user:null` 跳转。

### 3.2 注入内容

```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="csrf-token" content="CSRF_TOKEN">
  <meta name="neoskin-mode" content="site"> <!-- site | admin -->
  <title>站点名</title>
  <script id="neoskin-bootstrap" type="application/json">
  { ...bootstrap payload... }
  </script>
  <script type="module" src="/app-next/site/assets/index-<hash>.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

要求：

1. JSON 中的 `<`、`>`、`&`、`U+2028/2029` 必须转义（防 `</script>` 截断）。
2. `csrf-token` 与 bootstrap 的 `csrfToken` 必须一致；前端优先读 meta。
3. `<html lang>` 用 locale 的 BCP-47 形式（`zh-CN`、`en`）。
4. `data-theme` 为 `light|dark`，取用户 `dark_mode` 选项。

### 3.3 bootstrap payload

```json
{
  "contractVersion": 1,
  "apiBase": "",
  "locale": "zh_CN",
  "localeFallback": "en",
  "siteName": "NeoSkin",
  "version": "6.0.11",
  "basePath": "/app-next/site/",
  "mode": "site",
  "csrfToken": "…",
  "locales": ["zh_CN", "en"],
  "user": {
    "uid": 1,
    "email": "user@example.com",
    "nickname": "Steve",
    "avatar": "/avatar/1",
    "score": 120,
    "permission": 2,
    "verified": true,
    "isAdmin": true,
    "isBanned": false,
    "darkMode": false
  },
  "options": {
    "site_name": "NeoSkin",
    "site_description": "…",
    "user_can_register": true,
    "captcha": true,
    "max_upload_file_size": 1024,
    "max_texture_width": 8192,
    "score_per_storage": 1,
    "private_score_per_storage": 10,
    "score_award_per_texture": 0,
    "score_per_player": 50,
    "score_per_closet_item": 50,
    "sign_score": "10,100",
    "take_back_scores_after_deletion": true,
    "player_name_rule": "official",
    "custom_player_name_regexp": "",
    "navbar_color": "navbar-dark bg-dark",
    "sidebar_color": "sidebar-dark-primary",
    "copyright_prefer": "1",
    "copyright_text": "© 2026"
  },
  "features": {
    "registration": true,
    "emailVerification": true,
    "passwordReset": true,
    "oauth": true,
    "reports": true,
    "plugins": true
  },
  "plugins": {
    "menus": [],
    "badges": [],
    "styles": [],
    "scripts": []
  }
}
```

字段规则：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `contractVersion` | ✅ | 整数；当前 `1` |
| `apiBase` | ✅ | 空串 = 同源；否则绝对 URL（如 `https://api.example.com`），不带尾斜杠 |
| `locale` | ✅ | 当前语言，如 `zh_CN` |
| `localeFallback` | ✅ | 回退语言，通常 `en` |
| `siteName` / `version` | ✅ | 站点名 / 后端版本 |
| `basePath` | ✅ | 静态资源前缀，以 `/` 结尾 |
| `mode` | ✅ | `site` / `admin` |
| `csrfToken` | ✅ | 空串表示 Cookie 模式无需 token（不推荐） |
| `locales` | ⬜ | 可选：站点支持的语言列表；缺省时前端使用内置列表 |
| `user` | ✅ | `null` 表示未登录 |
| `options` | ✅ | 见 §3.4，未知键忽略 |
| `features` | ✅ | 前端据此隐藏入口 |
| `plugins` | ✅ | 插件注入，缺省为空数组 |

`user.avatar` 是站点绝对路径（`/avatar/1`），前端不拼接 basePath。

### 3.4 options 键

必须提供前端实际使用的键；其余键原样透传。

站点：`site_name`、`site_description`、`user_can_register`、`captcha`、
`max_upload_file_size`（KB）、`max_texture_width`、`score_per_storage`、
`private_score_per_storage`、`score_award_per_texture`、`score_per_player`、
`score_per_closet_item`、`sign_score`（`"min,max"`）、`take_back_scores_after_deletion`、
`register_with_player_name`（布尔，注册时是否要求角色名）、`player_name_rule`（`official|cjk|regexp`）、`custom_player_name_regexp`、
`navbar_color`、`sidebar_color`、`copyright_prefer`、`copyright_text`。

管理端另需（可只在 admin bootstrap 中出现）：`recaptcha`、`recaptcha_site_key`、
`recaptcha_secret_key`（不返回给前端）、`update_source`、`plugin_market_source`。

---

## 4. 静态资源

| 路径 | 缓存 |
| --- | --- |
| `/app-next/{site,admin}/assets/*-<hash>.*` | `public, max-age=31536000, immutable` |
| `/app-next/{site,admin}/index.html` | `no-cache` |
| `/app-next/manifest.json` | `no-cache` |

`manifest.json`（由 `scripts/publish.ps1` 生成）：

```json
{
  "frontendVersion": "0.1.0",
  "contractVersion": 1,
  "builtAt": "2026-11-01T12:00:00Z",
  "apps": {
    "site": { "entry": "/app-next/site/assets/index-abc123.js", "css": ["/app-next/site/assets/index-def456.css"] },
    "admin": { "entry": "/app-next/admin/assets/index-xyz789.js", "css": ["/app-next/admin/assets/index-uvw012.css"] }
  }
}
```

端口启动时读取该文件：`contractVersion` 不匹配则强制 `legacy` 并记录告警。

---

## 5. 认证与 CSRF

### 5.1 Session

- Cookie 名与 PHP 版一致（`blessing_skin_session` 或端口等价实现）。
- `HttpOnly`、`SameSite=Lax`、`Path=/`；HTTPS 下 `Secure`。
- SPA 请求：`credentials: 'same-origin'`（`apiBase` 跨域时 `include`）。

### 5.2 写请求

```http
POST /user/profile HTTP/1.1
X-CSRF-TOKEN: <meta csrf-token>
Content-Type: application/json
```

- 失败返回 `419`（Laravel 语义）或 `403`，body 为
  `{"message":"CSRF token mismatch."}`。
- 前端遇到 419：重新拉取 `/api/bootstrap`（或刷新页面）后重试一次。

### 5.3 鉴权失败

| 状态 | body | 前端行为 |
| --- | --- | --- |
| 401 | `{"message":"Unauthenticated."}` | 跳 `/auth/login?redirect=<path>` |
| 403 | `{"code":1,"message":"…"}` | 403 页/提示 |
| 419 | `{"message":"CSRF token mismatch."}` | 刷新 bootstrap 后重试一次 |
| 422 | `{"message":"The given data was invalid.","errors":{…}}` | 字段级错误展示 |
| 429 | `{"message":"Too Many Requests."}` | 提示稍后再试 |

`401` 文案保留英文（Laravel 行为），不翻译。

---

## 6. 响应与分页

### 6.1 业务响应

```json
{ "code": 0, "message": "…", "data": { } }
```

- `code = 0` 成功；`1` 业务失败；`2` 需要前端特殊处理（如重复材质，带 `data.tid`）。
- `message` 已按当前 locale 翻译（`language_lines` 覆盖生效）。
- 只读查询端点也可直接返回数组/分页对象（与既有 PHP 端点保持一致）。

### 6.2 分页

```json
{
  "data": [],
  "current_page": 1,
  "last_page": 3,
  "per_page": 10,
  "total": 25
}
```

- 页码参数 `page`，从 1 开始；每页默认 10（管理端表格 15）。
- 不引入 `meta`/`links` 外层，保持与 Laravel `paginate()` 一致。

---

## 7. 端点

### 7.1 既有端点（不得修改）

以下端点已由四个端口按 PHP 版实现，前端直接使用：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/user` | 当前用户 |
| GET | `/api/players` | 角色列表 |
| GET | `/api/closet`、`/api/closet/ids` | 衣柜 |
| GET | `/skinlib/list` | 材质列表（分页/筛选/排序） |
| GET | `/skinlib/info/{tid}` | 材质详情 |
| GET | `/user/player/list` | 用户角色（页面数据） |
| GET | `/user/closet/list`、`/user/closet/ids` | 衣柜（页面数据） |
| GET | `/user/score-info` | 积分规则 |
| GET | `/admin/reports/list`、`/api/admin/reports` | 举报列表 |
| GET | `/api/admin/users` | 用户列表 |
| GET | `/api/admin/players` | 角色列表 |
| GET | `/api/admin/closet/{uid}` | 用户衣柜 |
| GET | `/admin/i18n/list` | 翻译列表 |
| GET | `/admin/plugins/data` | 插件列表/状态 |
| GET | `/admin/plugins/market/list` | 插件市场 |
| GET | `/admin/chart` | 注册/上传曲线 |
| GET | `/lang/{locale}.js` | 语言包 |
| GET | `/oauth/clients`、`/oauth/tokens`、`/oauth/personal-access-tokens` | OAuth 管理 |
| GET | `/auth/captcha` | 验证码图片 |

写操作端点（登录/注册/资料/材质/举报/管理端 CRUD）全部沿用现有路径与字段，
前端不新增 `PUT /api/...` 变体。例外：`POST /admin/i18n` 原本 302 回旧页面，
四个端口在 `Accept: application/json` 时改为返回 `{code:0,message}`（与其它写端点一致）。

### 7.2 新增端点（v1 必须实现）

#### `GET /api/bootstrap`

- 认证：可选（匿名返回 `user:null`）。
- 返回：`{"code":0,"data":{…bootstrap payload…}}`。
- `csrfToken` 可为空串（同源时前端用 meta）；不得缓存。

#### `GET /api/user/inbox?page=1&per_page=10`

认证：必须。

```json
{
  "data": [
    {
      "id": 12,
      "title": "系统公告",
      "preview": "维护通知…",
      "format": "html",
      "read_at": null,
      "created_at": "2026-11-01 10:00:00",
      "communication_id": 3
    }
  ],
  "current_page": 1,
  "last_page": 1,
  "per_page": 10,
  "total": 1,
  "unread": 1
}
```

`preview` 为纯文本（HTML 已剥离），最多 120 字符。

#### `GET /api/user/inbox/{id}`

认证：必须。返回单条并**标记已读**（幂等）。

```json
{ "code": 0, "data": { "id": 12, "title": "…", "content": "<p>…</p>", "format": "html", "read_at": "2026-11-01 10:05:00", "created_at": "…", "communication_id": 3 } }
```

不存在或不属于当前用户：`404`。

#### `GET /api/user/reports?page=1&per_page=10`

认证：必须。

```json
{
  "data": [
    { "id": 5, "tid": 12, "texture_name": "skin.png", "reason": "…", "status": 0, "report_at": "2026-11-01 09:00:00" }
  ],
  "current_page": 1, "last_page": 1, "per_page": 10, "total": 1
}
```

`status`：`0` 待处理、`1` 已解决、`2` 已拒绝（与 PHP `Report` 常量一致）。

#### `GET /api/admin/dashboard`

认证：管理员。返回仪表盘统计（图表继续复用 `GET /admin/chart`）：

```json
{ "users": 12, "players": 20, "textures": 37, "storage": 2048, "storageHuman": "2.0MB" }
```

`storage` 单位为 KB；`storageHuman` 与旧版 `KB`/`MB` 展示一致。

#### `GET|PUT /api/admin/options/{group}`

认证：管理员。`group`：`options`、`customize`、`score`、`resource`。

- `GET` 返回该组选项的键值对象（值为字符串；布尔项为 `"true"`/`"false"`），
  `options` 组的 `site_name`/`site_description`/`content_policy` 返回当前语言版本；
  `score` 组额外返回 `sign_score_from`、`sign_score_to`。
- `PUT` 接收同结构 JSON（布尔项可直接传 `true`/`false`），保存后返回 `{code:0,message}`。
- 未知组返回 404；非管理员返回 403；匿名返回 401。

#### `GET /api/admin/update/info`

认证：管理员。返回更新检查结果（下载/安装仍用既有端点）：

```json
{
  "latest": "6.0.12_patch", "current": "6.0.11_patch", "error": "",
  "can_update": true, "package": null, "notice": "",
  "upload_limits": { "application": 1073741824, "upload": 1073741824 }
}
```

`package` 为当前会话已下载待安装的运行包（无则 `null`）。

#### `GET /api/admin/communications?page=1`

认证：管理员。直接返回分页对象（`data/current_page/last_page/per_page/total`），
条目含 `id/title/kind/status/read_count/delivery_count/updated_at`。

#### `GET /api/admin/communications/{id}`

认证：管理员。直接返回编辑器数据：

```json
{
  "id": 1, "title": "维护公告", "kind": "announcement", "status": "draft",
  "locale": "", "editor": "blocks", "source": "",
  "blocks": [{ "type": "text", "content": "…", "title": "", "tone": "info", "expanded": false }],
  "audience": { "receiver": "all", "uid": null, "email": null }
}
```

> `POST|PUT /admin/communications*` 与撤回在请求头 `X-Neoskin-Spa: 1` 存在时返回
> `{code:0,message,data:{id,status}}`，否则保持原 302；`preview`/`import` 原本即返回 JSON。

#### `GET /api/admin/status`

认证：管理员。返回运行状态 JSON（`bs` / `server` / `db` / `plugins`），供状态页直接展示。

## 8. 上传

- 字段名 `file`（`multipart/form-data`），与 PHP 版一致。
- 限制：`max_upload_file_size`（KB，0 = 不限制）、`max_texture_width`。
- 超过限制返回业务错误 `code=1`，`message` 已翻译。
- 允许的 MIME/扩展名与 PHP 版一致（PNG）。
- 前端上传前做尺寸预检，后端必须再次校验。

---

## 9. 国际化

1. 壳注入 `locale` 与 `localeFallback`。
2. 前端请求 `/lang/{locale}.js`（`blessing.i18n = {...}`），解析后注入 i18next。
3. 语言键与 PHP 版完全一致，不允许前端自造键。
4. 切换语言：写 `locale` cookie + 重新加载 bootstrap（或仅切换 i18n 资源）。
5. 后端 `language_lines` 覆盖必须已合并进 `/lang/{locale}.js`。

---

## 10. 插件注入

`bootstrap.plugins` 结构：

```json
{
  "menus": [{ "area": "user|admin|explore", "title": "…", "url": "/…", "icon": "…", "order": 10 }],
  "badges": [{ "text": "…", "tone": "info|success|warning|danger" }],
  "styles": ["/plugins/example/style.css"],
  "scripts": ["/plugins/example/app.js"]
}
```

- `styles/scripts` 由前端在挂载后按顺序插入，失败不阻塞页面。
- 插件脚本可继续使用 `window.blessing`（legacy 数据）与 `.locale`、`#logout-button` 钩子。

---

## 11. 契约测试

前端仓库提供：

```bash
node scripts/contract-check.mjs --base http://127.0.0.1:8080 --mode site
node scripts/contract-check.mjs --base http://127.0.0.1:8080 --mode admin --cookie session=…
```

检查项：

1. `/app-next/{mode}/` 返回 HTML 且含 `#neoskin-bootstrap`。
2. bootstrap 能解析，字段/类型符合 `packages/contract/schema/bootstrap.json`。
3. `GET /api/bootstrap` 同构（忽略 `csrfToken`）。
4. 所有新增端点状态码正确、分页字段齐全。
5. 写端点缺 CSRF 返回 419/403。
6. `/lang/{locale}.js` 可解析。

任一端口 CI 返回非 0 即视为契约破坏。

---

## 12. 变更流程

1. 修改本文件 + `packages/contract/schema/*.json`。
2. 升 `contractVersion`（破坏性变更）或加字段（兼容变更，版本不变）。
3. 前端先兼容新旧字段，再要求后端升级。
4. 四个端口全部通过 `contract-check` 后才允许把 `FRONTEND_MODE` 设为 `next`。
