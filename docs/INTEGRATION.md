# 端口接入指南

> 目标读者：`NeoSkinGo` / `NeoSkin.NET` / `NeoSkinSpringBoot` / `NeoSkinRS` 的维护者。
> 按顺序完成下列 7 步，即可让端口支持 `FRONTEND_MODE=next`。

---

## 1. 获取产物

三种方式，任选其一：

| 方式 | 做法 | 适用 |
| --- | --- | --- |
| 发布包 | 下载 `neoskin-frontend-<version>.zip`，解压到 `public/app-next/` | 生产 |
| 本地构建 | `pnpm install && pnpm -r build`，再执行 `scripts/publish.ps1 -Backend <端口目录>` | 开发 |
| git submodule | `git submodule add <repo> NeoSkinFrontend`，构建后复制 | 需要跟最新 |

约定产物结构：

```text
<backend>/public/app-next/
├── manifest.json
├── site/            # apps/site/dist
│   ├── index.html
│   └── assets/…
└── admin/           # apps/admin/dist
    ├── index.html
    └── assets/…
```

`public/app-next/` 由端口仓库提交（四端 CI 直接使用；`.gitattributes` 标记 `public/app-next/** -text` 防止换行转换）。

---

## 2. 静态托管

要求：

1. `/app-next/site/*`、`/app-next/admin/*` 映射到对应目录。
2. 带 hash 的 `assets/*` 设置一年 immutable 缓存。
3. `index.html` 设置 `no-cache`。
4. 请求路径带扩展名但文件不存在 → 404（不要回退 HTML）。
5. 其余未知路径回退到对应 `index.html`。

### 2.1 Go（Goravel）

```go
facades.Route().Static("/app-next/site", "./public/app-next/site")
facades.Route().Static("/app-next/admin", "./public/app-next/admin")
// 另注册壳路由（见 §3），优先级高于 Static 的目录索引
```

### 2.2 ASP.NET Core

```csharp
app.UseStaticFiles(new StaticFileOptions {
    FileProvider = new PhysicalFileProvider(Path.Combine(env.ContentRootPath, "public/app-next")),
    RequestPath = "/app-next",
    OnPrepareResponse = ctx => {
        var immutable = ctx.File.Name.Contains('-');
        ctx.Context.Response.Headers.CacheControl =
            immutable ? "public,max-age=31536000,immutable" : "no-cache";
    }
});
```

### 2.3 Spring Boot

```java
registry.addResourceHandler("/app-next/**")
        .addResourceLocations("file:public/app-next/")
        .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable());
```

### 2.4 Rust（Suprnova）

静态目录挂载 + 自定义 Cache-Control 中间件；回退逻辑同 §2 第 5 条。

---

## 3. SPA 壳

壳 = 读取 `public/app-next/{mode}/index.html`，在 `</head>` 前**注入**两段内容后返回（Vite 产物无需占位符）：

```html
<meta name="csrf-token" content="…">
<meta name="neoskin-mode" content="site">
<script id="neoskin-bootstrap" type="application/json">{…}</script>
```

注入规则：

- `csrf-token` → 当前会话 token（HTML 属性转义）
- bootstrap JSON → 转义 `<`、`>`、`&`、U+2028/2029，防止 `</script>` 截断
- 同时保留 Vite 生成的 `<script type="module" src="/app-next/...">`

### 3.1 路由匹配

| 请求 | 处理 |
| --- | --- |
| `/app-next/site`、`/app-next/site/` | 返回 site 壳 |
| `/app-next/site/...`（无扩展名） | 返回 site 壳 |
| `/app-next/site/...`（有扩展名） | 静态文件；不存在 404 |
| `/app-next/admin/*` | 同上，admin 壳 |

### 3.2 Go 示例

```go
router.Get("/app-next/site", shellHandler("site"))
router.Get("/app-next/site/{path...}", shellHandler("site"))
router.Get("/app-next/admin", shellHandler("admin"))
router.Get("/app-next/admin/{path...}", shellHandler("admin"))
```

`shellHandler`：

1. 若路径含 `.`（扩展名）→ 交给静态处理器；
2. 读取 `public/app-next/{mode}/index.html`；
3. 生成 bootstrap（见 §4）；
4. 替换占位符，`Content-Type: text/html; charset=utf-8`，`Cache-Control: no-cache`。

> 未实现 `next` 时，这些路由可直接返回 `404`，不影响 `legacy`。

---

## 4. bootstrap 生成

数据来源（按端口现有实现取）：

| 字段 | 来源 |
| --- | --- |
| `user` | 当前会话用户 + `verified`/`isAdmin`/`isBanned`/`darkMode` |
| `options` | `options` 表（`site_name`、上传限制、积分、配色、版权…） |
| `features` | 由 options 推导（注册开关、邮箱验证、找回、OAuth、举报、插件） |
| `plugins` | 插件菜单/徽章/样式/脚本（无插件时为空数组） |
| `locale` / `localeFallback` | 语言检测中间件结果 + `en` |
| `basePath` | `/app-next/{mode}/` |
| `contractVersion` | 常量 `1` |
| `csrfToken` | 会话 CSRF token |

注意：

- 匿名访问也必须返回完整 `options` 与 `plugins`（用户为 `null`）；
- 管理端壳要求管理员会话，否则返回 `403`（由前端展示，不重定向）；
- 不要返回任何密钥（`APP_KEY`、`recaptcha_secret_key`、数据库密码）。

---

## 5. 新增端点

按 `docs/BACKEND-CONTRACT.md` §7.2 实现 10 个端点。建议映射：

| 端点 | Go | .NET | Spring Boot | Rust |
| --- | --- | --- | --- | --- |
| `/api/bootstrap` | `BootstrapController` | `BootstrapController` | `BootstrapController` | `bootstrap` |
| `/api/user/inbox` | `NotificationController` 扩展 | `NotificationsController` | `NotificationController` | `notifications` |
| `/api/user/inbox/{id}` | 同上 | 同上 | 同上 | 同上 |
| `/api/user/reports` | `ReportController` 扩展 | `ReportsController` | `ReportController` | `reports` |
| `/api/admin/communications` | `CommunicationsController` 扩展 | `CommunicationsController` | `CommunicationsController` | `communications` |
| `/api/admin/communications/{id}` | 同上 | 同上 | 同上 | 同上 |
| `/api/admin/dashboard` | `AdminController` 扩展 | `DashboardController` | `AdminController` | `admin` |
| `/api/admin/options/{group}` | `AdminOptionsController` 扩展 | `OptionsController` | `OptionsController` | `options` |
| `/api/admin/status` | `AdminController` 扩展 | `StatusController` | `StatusController` | `status` |
| `/api/admin/update/info` | `UpdateController` 扩展 | `UpdateController` | `UpdateController` | `update` |

实现要点：

- 复用现有仓储/服务，不要复制业务逻辑；
- 分页字段与既有端点的 `page` 一致；
- 返回 JSON 时统一 `application/json`（无 charset）；
- 业务错误走现有 `t(ctx, key)` 等价翻译机制；
- 管理端端点沿用现有 scope（`UsersManagement.Read` 等），Session 用户按权限判定。

### 5.1 P2 皮肤库复用既有端点

皮肤库**不新增契约端点**，直接复用 PHP 版已有路由（端口需保持语义一致）：

| 用途 | 端点 |
| --- | --- |
| 列表 / 详情 | `GET /skinlib/list`、`GET /skinlib/info/{tid}`、`GET /texture/{tid}` |
| 上传 / 管理 | `POST /texture`、`PUT /texture/{tid}/name`、`PUT /texture/{tid}/type`、`PUT /texture/{tid}/privacy`、`DELETE /texture/{tid}` |
| 衣柜 / 头像 | `GET /user/closet/ids`、`POST /user/closet`、`DELETE /user/closet/{tid}`、`POST /user/profile/avatar` |
| 举报 / 下载 | `POST /skinlib/report`、`GET /raw/{tid}` |
| 预览 / 纹理 | `GET /preview/{tid}`（默认 WebP，`?png` 返回 PNG）、`GET /textures/{hash}` |

> 前端在 `<picture>` 中同时使用 WebP 与 PNG，端口必须支持两种；3D 预览直接加载
> `/textures/{hash}`，因此响应需为原始 PNG。

### 5.2 P3 用户中心

仪表盘、资料、角色、衣柜、OAuth 复用既有端点：

| 用途 | 端点 |
| --- | --- |
| 仪表盘 / 签到 | `GET /user/score-info`、`POST /user/sign`、`POST /user/email-verification` |
| 资料 | `POST /user/profile?action=nickname|password|email|delete`、`POST /user/profile/avatar` |
| 角色 | `GET /user/player/list`、`POST /user/player`、`PUT /user/player/{pid}/name`、`PUT /user/player/{pid}/textures`、`DELETE /user/player/{pid}/textures`、`DELETE /user/player/{pid}` |
| 衣柜 | `GET /user/closet/list`、`GET /user/closet/ids`、`PUT /user/closet/{tid}`、`DELETE /user/closet/{tid}` |
| OAuth | `GET/POST /oauth/clients`、`PUT/DELETE /oauth/clients/{id}` |

站内信与我的举报使用新增契约端点（四端已实现；缺失时前端显示提示而非白屏）：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/user/inbox?page=1&per_page=10` | 站内信分页（含 `unread`） |
| GET | `/api/user/inbox/{id}` | 详情（自动已读，`{code,data}`） |
| GET | `/api/user/reports?page=1&per_page=10` | 我的举报分页 |

> 返回结构以 `docs/BACKEND-CONTRACT.md` §7.2 为准；`scripts/contract-check.mjs`
> 会额外断言这三个路径匿名访问返回 `401 application/json`。

---

## 6. 开关与配置

```env
FRONTEND_MODE=legacy                 # legacy | next
FRONTEND_NEXT_ROUTES=                # 可选：site:home,site:auth,admin:dashboard
```

实现建议：

1. 启动时读取 `public/app-next/manifest.json`；
2. 文件缺失、`contractVersion` 不匹配 → 强制 `legacy`，日志 warning；
3. `FRONTEND_MODE=next` 且页面在 `FRONTEND_NEXT_ROUTES` 内 → 返回壳；
4. 页面键约定：`site:*`、`admin:*`，未列出的页面保持 legacy。

---

## 7. 验证

```bash
# 1. 端口启动后
node NeoSkinFrontend/scripts/contract-check.mjs --base http://127.0.0.1:8080

# 2. 浏览器
#    /app-next/site/          → 首页
#    /app-next/site/auth/login
#    /app-next/admin/
```

检查：

- 页面无 404 资源、无 console error；
- 未登录访问 `/app-next/admin/` 显示 403；
- 登录后刷新不丢会话；
- 切换语言后文案与 `/lang/<locale>.js` 一致；
- `/app-next/site/skinlib` 能加载列表，上传 PNG 后可在详情页 2D/3D 切换；
- `/preview/{tid}` 默认返回 `image/webp`，带 `png` 查询返回 `image/png`；
- `/app-next/site/user` 能签到、显示积分/使用量，角色与衣柜可增删改；
- `/app-next/site/user/oauth/manage` 可创建应用并只显示一次密钥；
- `/api/user/inbox`、`/api/user/reports` 返回分页 JSON（未实现时页面显示提示）。

---

## 8. 回滚

```env
FRONTEND_MODE=legacy
```

无需删除 `public/app-next/`；旧壳路由仍可访问用于排查。

---

## 9. 四端实现现状（2026-11-07）

| 端口 | 实现入口 | 静态托管 |
| --- | --- | --- |
| Go | `app/http/controllers/spa_controller.go` + `routes/web.go` | 同一个 handler：命中文件直出，否则回退 `index.html` |
| Rust | `src/controllers/spa.rs` + `src/routes.rs` | 同上；`{*path}` 捕获剩余路径 |
| .NET | `src/NeoSkin.Web/Web/SpaFrontend.cs`（`NeoSkinApp` 中挂在路由分发器前） | 同上；复用 `EncryptCookies` + `StartSession` |
| Spring | `com.neoskin.web.SpaFrontend` + `VertxRouteRegistry.registerSpaRoute` | 静态 handler 对 `/app-next/` 放行，交给壳 handler |

共同点：

- 都返回 `Content-Type: text/html; charset=utf-8` 且 `Cache-Control: no-cache` 的壳；
- 命中 `assets/*-<hash>.*` 时返回 `public, max-age=31536000, immutable`；
- 带扩展名但缺失的文件返回 404；
- `/api/bootstrap` 返回 `{code:0,message:"ok",data:{…}}`，不缓存。
