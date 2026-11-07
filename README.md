# NeoSkinFrontend

Blessing Skin Server 6.0.11 系列移植项目的**共享前端**。

> 仓库：<https://github.com/KnightBlood/neoskin-frontend>（`main`）
> 本目录不属于任何一个后端仓库。`NeoSkinGo`、`NeoSkin.NET`、
> `NeoSkinSpringBoot`、`NeoSkinRS` 都通过同一套 HTTP 契约复用它。

## 是什么

- 两个独立前端项目：
  - `apps/site` —— 公开站 + 用户中心，**TDesign React 1.18.6**
  - `apps/admin` —— 管理端，**Ant Design 6.7.0**
- 统一技术栈：React **19.3**、Vite **8.3.6**、TypeScript **7.0**。
- 只依赖**后端契约**（`docs/BACKEND-CONTRACT.md`），不依赖任何具体后端语言。
- 构建产物复制到各端口的 `public/app-next/{site,admin}`，由端口决定
  `FRONTEND_MODE=legacy|next` 是否启用。

## 不是什么

- 不修改 `blessing-skin-server-*` 源项目。
- 不替换 `public/app`（PHP 预编译产物）——它仍是 `legacy` 默认实现。
- 不包含后端代码、数据库迁移或 PHP 插件运行时。

## 目录（规划）

```text
NeoSkinFrontend/
├── apps/
│   ├── site/                  # TDesign；独立 package.json / vite.config / 产物
│   └── admin/                 # antd；独立 package.json / vite.config / 产物
├── packages/
│   ├── core/                  # HTTP/CSRF/i18n/主题/权限（两 app 共用）
│   └── contract/              # 契约类型 + 运行时校验（由契约文档生成）
├── docs/
│   ├── BACKEND-CONTRACT.md    # 所有后端端口必须实现的契约
│   └── INTEGRATION.md         # 各端口接入步骤
├── scripts/
│   ├── publish.ps1            # 产物复制到指定端口
│   └── contract-check.mjs     # 对任意端口跑契约检查
└── PLAN.md                    # 重构计划（阶段/验收）
```

## 当前状态

**P3 前端完成（2026-11-07）**。已交付：

| 区域 | 内容 |
| --- | --- |
| 站点认证 | 登录（`redirect` 回跳、记住我）、注册（角色名/昵称）、找回密码、重置密码、验证码 |
| 站点壳 | 用户菜单、退出登录、深色模式、语言切换、未登录路由守卫、全局提示（React 19 兼容） |
| 皮肤库 | 列表（模型/披风筛选、关键词、最新/最多收藏、我上传的、上传者过滤、分页）、详情（2D/3D/披风、衣柜、设头像、下载、举报、改名、切模型、隐私、删除）、上传（PNG 校验、Alex 自动识别、尺寸预检、积分预估、3D 预览、重复检测） |
| 用户中心 | 侧栏 + 仪表盘（积分/使用量/签到/积分说明/邮箱验证）、资料（昵称/密码/邮箱/头像重置/注销）、角色（增删改/清除材质/3D）、衣柜（筛选/搜索/分页/应用至角色/改名/头像/移除）、OAuth 应用 CRUD、站内信与我的举报列表/详情 |
| 管理端 | 登录跳转、非管理员 403、仪表盘骨架 |
| 四端后端 | `GET /api/bootstrap` + `/app-next/{site,admin}/*` 壳与静态托管；`FRONTEND_MODE=next` 时 `/`、`/admin` 302 到 SPA |
| 自动化 | 四端 `contract-check.mjs`（壳 + bootstrap + 皮肤库端点）；`tests/browser/flows.mjs` 覆盖 app-next 登录与仪表盘 |

`pnpm -r typecheck && pnpm -r test && pnpm -r build` 全绿；P3 已在 Go 生产构建上用浏览器验证
仪表盘 → 资料 → 角色 → 衣柜 → OAuth 全流程，0 console error。

> 用户中心新增契约端点 `GET /api/user/inbox`、`GET /api/user/inbox/{id}`、`GET /api/user/reports`
> 已在四端实现（见 `docs/BACKEND-CONTRACT.md` §7.2）；`contract-check.mjs` 会断言匿名请求返回 401 JSON。

### 本地开发

```powershell
corepack enable
corepack prepare pnpm@12.16.1 --activate
pnpm install
pnpm -r build                 # 产出 apps/*/dist
node scripts/mock-server.mjs  # 无后端预览：http://127.0.0.1:4175/app-next/site/
```

接入真实后端时，把产物发布到端口仓库：

```powershell
.\scripts\publish.ps1 -Target D:\WORKspace\NeoSkin\NeoSkinGo
node scripts\contract-check.mjs --base http://127.0.0.1:8080
```

## 版本

| 项 | 版本 |
| --- | --- |
| React / React DOM | 19.3.1 |
| Vite | 8.3.6 |
| TypeScript | 7.0.2 |
| TDesign React | 1.18.6 |
| Ant Design | 6.7.0 |
| skinview3d | 3.4.2（内置 three 0.156.1，按需懒加载） |
| Node.js | 24.12.0 LTS |
| pnpm | 12.16.1 |

版本可用性与 peer 兼容性已核实（2026-11-01），详见 `PLAN.md` §1。

## 给后端移植者的最小要求

1. 提供 **SPA 壳**：`GET /app-next/site/*`、`GET /app-next/admin/*`，返回
   `index.html` 并注入 `<meta name="csrf-token">` + `<script id="neoskin-bootstrap"
   type="application/json">…</script>`。
2. 实现 `GET /api/bootstrap`（静态托管/CDN 场景的回退）。
3. 保证既有 PHP 兼容 JSON 端点可用，并补齐 `docs/BACKEND-CONTRACT.md` §7 的
   新增端点。
4. 静态资源按 `/app-next/{site,admin}/` 托管，未知路径回退 `index.html`。

任何一项不满足，前端都会在启动时给出明确错误（缺 bootstrap / 401 / 419 / 契约版本不符）。
