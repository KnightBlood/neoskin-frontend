# NeoSkinFrontend 重构计划

> 定位：Blessing Skin Server 6.0.11 移植项目的**共享前端**，独立于任何后端。
> 目标版本：React 19.3 + Vite 8.3.6 + TypeScript 7.0，站点端 TDesign 1.18.6、管理端 antd 6.7.0。
> 状态：P0（2026-11-06）、P1（2026-11-07）、P2（2026-11-07）已完成；P3 已完成；
> P4 管理端前端完成仪表盘/用户/玩家/举报/状态（其余页面下一轮）。
> 仓库：<https://github.com/KnightBlood/neoskin-frontend>（`main`）。

---

## 0. 边界

### 0.1 与后端仓库的关系

```text
D:\WORKspace\NeoSkin\
├── NeoSkinGo\            # Go / Goravel 端口（只保留「如何接入共享前端」的说明）
├── NeoSkin.NET\          # .NET 端口
├── NeoSkinSpringBoot\    # Java 端口
├── NeoSkinRS\            # Rust 端口
├── NeoSkinFrontend\      # ← 本仓库：唯一的前端源码
└── conformance\          # 跨端口契约数据（路由/表结构/JSON 等）
```

- 前端**只**依赖 `docs/BACKEND-CONTRACT.md`，不 import 任何后端代码，不读取后端目录。
- 每个端口只做三件事：托管构建产物、注入 SPA 壳、实现契约端点。
- 前端版本独立发布，端口在 `PORT-NOTES.md` 记录所锁定的前端版本。

### 0.2 与 `public/app`（PHP 预编译产物）的关系

- `public/app` 与现有服务端模板继续作为 `FRONTEND_MODE=legacy`（默认）。
- 新前端只通过 `FRONTEND_MODE=next` 或逐页白名单启用；随时可回滚。
- 不删除、不改写 `public/app`，避免破坏插件与既有第三方脚本。

### 0.3 两个前端项目

`apps/site` 与 `apps/admin` 是**两个独立构建/部署单元**：

- 各自 `package.json`、`vite.config.ts`、`tsconfig.json`、`.env` 约定；
- 各自产物（`dist/`）与路由前缀（`/app-next/site/`、`/app-next/admin/`）；
- 互不引用对方页面/样式，不共享运行时代码；
- 共享内容只来自 `packages/core`（请求/CSRF/i18n/主题）与 `packages/contract`（类型/校验）。
  共享包通过 pnpm workspace `link:` 引入，只是源码复用，不产生第三份部署产物。

> 之所以从「两个完全独立仓库」调整为「一个仓库 + 两个 app」：前端现在要服务四个后端端口，
> 若再拆成两个仓库，契约类型、CSRF、i18n 会三处漂移。两个 app 的**部署边界与产物**保持不变。

### 0.4 当前交付状态（2026-11-07）

| 阶段 | 状态 | 交付物 |
| --- | --- | --- |
| P0 基座 | ✅ | workspace、两个 app、`core`/`contract`、Vite、Vitest、CI |
| P1 契约 + 认证 | ✅ | 四端 `/api/bootstrap` + SPA 壳、登录/注册/找回/重置、用户菜单/深色模式/语言切换、管理端守卫、Playwright app-next 流程 |
| P2 皮肤库 | ✅ | 浏览、筛选/排序/搜索、详情、上传、衣柜、举报、2D/3D/披风预览 |
| P3 用户中心 | ✅ | 仪表盘（积分/使用量/签到/邮箱验证）、资料、角色、衣柜、OAuth、站内信（列表/详情/已读）、我的举报 |
| P4 管理端 | 🟡 | 仪表盘（统计 + SVG 曲线）、用户管理（邮箱/昵称/密码/积分/权限/验证/删除）、玩家管理（改名/拥有者/材质/删除）、举报审核、运行状态；配置/翻译/插件/市场/更新下一轮 |
| P5 通信编辑器 | ⬜ | 画布、属性面板、源码导入、实时预览、撤回 |
| P6 切换验收 | ⬜ | `FRONTEND_MODE=next` 全站、性能/可访问性、四端回归 |

P1 已验证：`pnpm -r typecheck / test / build` 全绿；四个后端本机登录 → `/app-next/site/user` →
`/app-next/admin/` 仪表盘均正常，0 console error；四端 `scripts/contract-check.mjs` 通过。

P2 已验证（Go 生产构建 + 浏览器全流程）：登录 → `/skinlib` 列表/筛选/搜索/排序/上传者过滤 →
上传 Steve/Alex/披风 → 详情 2D/3D → 衣柜增删 → 改名/切模型/隐私/举报/下载/删除 → 重复上传提示，
0 console error。期间修复：TDesign `MessagePlugin` 依赖 React 19 已移除的 `ReactDOM.render`，
改为仓库内 `lib/toast.tsx`（声明式 `<Message>` + 队列）；卡片图片补显式高度避免懒加载 0 尺寸。

P3 已验证（Go 生产构建 + 浏览器全流程）：仪表盘积分/使用量/签到/积分说明、资料页昵称/头像重置/
密码一致性校验、角色新增/改名/清除材质/删除/3D 预览、衣柜筛选/选择/3D/应用至角色/改名/设为头像/移除、
OAuth 应用创建（密钥仅显示一次）/改名/改回调/删除；站内信列表/详情（自动已读）与我的举报分页。
积分变化后通过 `refreshBootstrap()` 同步侧栏，0 console error。

四端已实现新增契约端点（本地构建通过，Go 已联调；`.NET` / `Spring` / `Rust` 待推送后由 CI 验证）：

| 端点 | Go | .NET | Spring | Rust |
| --- | --- | --- | --- | --- |
| `GET /api/user/inbox` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/user/inbox/{id}` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/user/reports` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/admin/dashboard`（P4） | ✅ | ✅ | ✅ | ✅ |

P4 前端已验证（Go 生产构建 + 浏览器）：管理端仪表盘统计/31 天曲线、用户搜索与邮箱/昵称/密码/积分/权限/
验证/删除、玩家改名/拥有者/材质/删除、举报审核（删除/封禁/拒绝）、运行状态；0 console error。

### 0.5 仓库与发布节奏

| 项 | 约定 |
| --- | --- |
| 远端 | `https://github.com/KnightBlood/neoskin-frontend.git` |
| 分支 | `main`（唯一长期分支） |
| 提交粒度 | 每个阶段一个 commit；前后端契约变更与 `docs/BACKEND-CONTRACT.md` 同步提交 |
| 产物发布 | 先在本仓库 `pnpm -r build`，再 `scripts/publish.ps1 -Target <端口>`，端口仓库单独提交 |
| 回滚 | 端口保持 `FRONTEND_MODE=legacy`；前端回滚只需重新发布上一版产物 |

---

## 1. 版本锁定

| 组件 | 锁定版本 | registry 最新 | 用途 |
| --- | --- | --- | --- |
| Node.js | **24.12.0 LTS** | — | 构建（Vite 8 要求 `^20.19 \|\| >=22.12`） |
| pnpm | **12.16.1** | 12.16.1 | 包管理 |
| React / React DOM | **19.3.1** | 19.3.1 | UI 运行时（满足 19.3 要求；19.3.0 亦可用） |
| Vite | **8.3.6** | 8.3.6 | 构建与开发服务器（最新补丁） |
| `@vitejs/plugin-react` | **6.2.1** | 6.2.1 | React 插件（peer `vite@^8`） |
| TypeScript | **7.0.2** | 7.0.2 | 类型（已升 TS 7 原生版） |
| TDesign React | **1.18.6** | 1.18.6 | 站点端组件库 |
| Ant Design | **6.7.0** | 6.7.0 | 管理端组件库 |
| React Router | **8.5.1** | 8.5.1 | Data Router（peer React `>=19.2.7`） |
| TanStack Query | **5.106.1** | 5.106.1 | 服务端状态 / 缓存 / 重试 |
| Axios | **1.21.0** | 1.21.0 | HTTP（CSRF / 401 / 419 拦截） |
| i18next / react-i18next | **26.7.2 / 17.1.13** | 同左 | 国际化 |
| dayjs | **1.11.23** | 1.11.23 | 时间（Asia/Shanghai） |
| Vitest / jsdom | **5.1.0 / 31.0.0** | 同左 | 单元/组件测试（peer `vite@^8`） |
| Testing Library | **16.3.3** | 16.3.3 | 组件测试 |
| Playwright | **1.65.0** | 1.65.0 | 浏览器 E2E |

### 1.1 版本核实结论（2026-11-01，Node 24.12.0）

- 依赖已按 2026-11-06 registry 最新版升级：`react@19.3.1`、`vite@8.3.6`、`typescript@7.0.2`、`tdesign-react@1.18.6`、`antd@6.7.0`。
- peer 兼容：
  - `tdesign-react@1.18.6` → `react >= 16.13.1` ✅
  - `antd@6.7.0` → `react >= 18.0.0` ✅
  - `@vitejs/plugin-react@6.2.1` / `vitest@5.1.0` → `vite ^8.0.0` ✅
  - `react-i18next@17.1.10` → `i18next >= 26.2.0` ✅
- 偏差与取舍（P0 时同步到 `PORT-NOTES.md`）：
  1. React 取 **19.3.1**（19.3 线最新补丁），不取 19.3.0。
  2. Vite 升级到最新补丁 **8.3.6**。
  3. TypeScript 升级到 **7.0.2**（原生版）；`antd`/`tdesign` 类型链已通过
     `pnpm -r typecheck`。
  4. React Router 取 **8.5.1**；若 P1 发现 Data Router API 不兼容，回退 `7.18.5`。
  5. pnpm 取 **12.16.1**。
- `@vitejs/plugin-react` 的 `oxc-transform-react` / `@rolldown/plugin-babel` /
  `babel-plugin-react-compiler` 均为 optional peer，不安装。

### 1.2 锁定方式

- `package.json` 全部写**精确版本**（不带 `^`/`~`）；
- `pnpm-lock.yaml` 入库；
- 根目录 `package.json` 声明 `engines.node`、`packageManager`，并用
  `corepack` 保证 Node/pnpm 一致。

---

## 2. 目录与共享策略

```text
NeoSkinFrontend/
├── package.json               # workspace 根；仅脚本与 devDependencies
├── pnpm-workspace.yaml        # apps/*、packages/*
├── tsconfig.base.json
├── .npmrc                     # 精确版本、engine-strict
├── apps/
│   ├── site/
│   │   ├── package.json
│   │   ├── vite.config.ts     # base: /app-next/site/、proxy /api
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app/           # Router、Providers、layouts
│   │   │   ├── pages/         # home / auth / skinlib / user
│   │   │   ├── components/    # Navbar、Sidebar、TextureCard、Previewer
│   │   │   ├── api/           # 资源函数（基于 core 的 client）
│   │   │   ├── i18n/
│   │   │   ├── stores/        # 主题、语言（客户端状态）
│   │   │   └── styles/
│   │   ├── tests/             # Vitest
│   │   └── e2e/               # Playwright
│   └── admin/                 # 同构，pages/admin/*
├── packages/
│   ├── core/
│   │   ├── src/http.ts        # CSRF、401/419、错误归一化、重试
│   │   ├── src/bootstrap.ts   # 读取 #neoskin-bootstrap / /api/bootstrap
│   │   ├── src/i18n.ts        # /lang/<locale>.js → i18next
│   │   ├── src/permissions.ts
│   │   └── src/theme.ts       # 颜色表 → TDesign/antd token
│   └── contract/
│       ├── src/types.ts       # 手写 + 生成
│       ├── src/guards.ts      # 运行时校验（不引入重依赖）
│       └── schema/*.json      # JSON Schema，供各端口契约测试复用
├── scripts/
│   ├── publish.ps1            # dist → <backend>/public/app-next/{site,admin}
│   └── contract-check.mjs     # 对任意端口跑契约检查
└── docs/
    ├── BACKEND-CONTRACT.md
    └── INTEGRATION.md
```

### 2.1 共享边界

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| 请求封装、CSRF、错误码 | `packages/core` | 两个 app 唯一网络入口 |
| bootstrap 读取/校验 | `packages/core` | 壳注入优先，`/api/bootstrap` 回退 |
| i18n 加载与 `t()` | `packages/core` | 语言键与 PHP 版一致 |
| 主题变量、深色模式 | `packages/core` | 输出 TDesign/antd 两套 token |
| 契约类型/JSON Schema | `packages/contract` | 后端端口也用它做契约测试 |
| 页面、布局、业务组件 | 各 `apps/*` | 不允许互相 import |

---

## 3. 后端契约（摘要）

完整定义见 [docs/BACKEND-CONTRACT.md](./docs/BACKEND-CONTRACT.md)。

### 3.1 SPA 壳

每个端口对 `GET /app-next/site/*`、`GET /app-next/admin/*` 返回 `index.html`，
并注入：

```html
<meta name="csrf-token" content="...">
<script id="neoskin-bootstrap" type="application/json">{ ... }</script>
```

bootstrap JSON 包含：`contractVersion`、`apiBase`、`locale`、`siteName`、`version`、
`basePath`、`mode`、当前用户、站点选项、功能开关、插件注入（菜单/徽章/样式/脚本）。

> 用 `type="application/json"` 而不是 `window.blessing = {...}`，避免脚本注入与
> 各语言模板的转义差异；`window.blessing` 只保留给 `legacy` 页面。

### 3.2 静态托管

- 目录：`public/app-next/site/`、`public/app-next/admin/`；
- 带 hash 的资源：`Cache-Control: public, max-age=31536000, immutable`；
- `index.html`：`no-cache`；
- 未知路径回退到对应 `index.html`（客户端路由）；
- `/app-next/*` 不参与 CSRF 校验，但下的 `/api/*` 照常校验。

### 3.3 认证与 CSRF

- 同源 Session Cookie；所有请求 `credentials: 'same-origin'`；
- 写请求带 `X-CSRF-TOKEN`（来自 meta 或 bootstrap）；
- `401` → 跳转 `/auth/login?redirect=<当前路径>`；
- `419` → 提示刷新并重新拉取 bootstrap；
- `403` → 403 页；被封禁用户显示 `auth.check.banned` 文案。

### 3.4 响应约定

- 业务响应：`{code:0|1|2, message, data?}`（与 PHP `json()` 一致）；
- 分页：`{data:[], current_page, last_page, per_page, total}`；
- 422：`{message, errors:{field:[...]}}`；
- 401：`{message:"Unauthenticated."}`（保留英文，对齐 Laravel）；
- `Content-Type` 必须是 `application/json`（无 charset）。

### 3.5 必须补齐的端点

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/bootstrap` | 静态托管/bootstrap 回退 |
| GET | `/api/user/inbox` | 站内信分页 |
| GET | `/api/user/inbox/{id}` | 站内信详情（自动已读） |
| GET | `/api/user/reports` | 我的举报分页 |
| GET | `/api/admin/communications` | 通信历史分页 |
| GET | `/api/admin/communications/{id}` | 通信编辑器数据 |
| GET | `/api/admin/dashboard` | 仪表盘统计 + 图表 |
| GET | `/api/admin/options/{group}` | options/customize/score/resource 表单值 |
| GET | `/api/admin/status` | 运行状态 |
| GET | `/api/admin/update/info` | 更新信息 |

其余复用既有 PHP 兼容端点（`/api/user`、`/api/players`、`/api/closet`、
`/skinlib/list`、`/skinlib/info/{tid}`、`/api/admin/users`、`/api/admin/players`、
`/api/admin/reports`、`/admin/i18n/list`、`/admin/plugins/data`、
`/admin/plugins/market/list`、`/admin/chart`、`/lang/{locale}.js`、OAuth 端点等）。

> 新增端点必须**同时**在四个端口实现；任一端口缺失时，`FRONTEND_MODE=next`
> 只应对缺失页面保持 `legacy`，不允许白屏。

---

## 4. 页面与路由

### 4.1 `apps/site`（TDesign）

| 页面 | 客户端路由 | 后端路径（壳） |
| --- | --- | --- |
| 首页 | `/` | `/` |
| 登录 | `/auth/login` | `/auth/login` |
| 注册 | `/auth/register` | `/auth/register` |
| 忘记密码 | `/auth/forgot` | `/auth/forgot` |
| 重置密码 | `/auth/reset/:uid` | `/auth/reset/{uid}` |
| 邮箱验证 | `/auth/verify/:user` | `/auth/verify/{user}` |
| 绑定邮箱 | `/auth/bind` | `/auth/bind` |
| 皮肤库 | `/skinlib` | `/skinlib` |
| 材质详情 | `/skinlib/show/:tid` | `/skinlib/show/{tid}` |
| 上传材质 | `/skinlib/upload` | `/skinlib/upload` |
| 用户仪表盘 | `/user` | `/user` |
| 资料 | `/user/profile` | `/user/profile` |
| 角色 | `/user/player` | `/user/player` |
| 衣柜 | `/user/closet` | `/user/closet` |
| 举报 | `/user/reports` | `/user/reports` |
| 站内信 | `/user/inbox` | `/user/inbox` |
| 站内信详情 | `/user/inbox/:id` | `/user/inbox/{id}` |
| OAuth 应用 | `/user/oauth/manage` | `/user/oauth/manage` |
| 错误页 | `*` | 403/404/419/500 |

> P1 已实现：首页、登录、注册、忘记密码、重置密码、用户仪表盘/资料/角色/衣柜/站内信/举报/OAuth 的
> **页面骨架与守卫**；邮箱验证、绑定邮箱页面留到 P3。
> P2 已实现：`/skinlib`（列表/筛选/搜索/排序/上传者/衣柜）、`/skinlib/show/:tid`（2D/3D/披风、
> 改名/切模型/隐私/举报/下载/删除/设头像）、`/skinlib/upload`（PNG 校验、Alex 自动识别、积分预估、3D 预览）。
> P3 已实现：用户中心侧栏、`/user`（积分/使用量/签到）、`/user/profile`、`/user/player`、
> `/user/closet`、`/user/inbox`、`/user/inbox/:id`、`/user/reports`、`/user/oauth/manage`；
> 站内信与举报页使用 `GET /api/user/inbox`、`GET /api/user/inbox/{id}`、`GET /api/user/reports`
> （契约见 §3.5，四端已实现）。

### 4.2 `apps/admin`（antd）

| 页面 | 客户端路由 |
| --- | --- |
| 仪表盘 | `/` |
| 用户 | `/users` |
| 玩家 | `/players` |
| 举报 | `/reports` |
| 站点配置 | `/options` |
| 配色/首页 | `/customize` |
| 积分 | `/score` |
| 资源 | `/resource` |
| 通信列表 | `/communications` |
| 通信编辑器 | `/communications/:id?`（`new` / `announcement`） |
| 翻译 | `/i18n` |
| 插件管理 | `/plugins/manage` |
| 插件市场 | `/plugins/market` |
| 状态 | `/status` |
| 更新 | `/update` |

管理端壳路径前缀 `/app-next/admin/*`，API 仍走站点同源 `/api/*`。

> `/oauth/authorize` 保留服务端渲染（第三方重定向，不应依赖 SPA 启动）。

---

## 5. 组件映射

### 5.1 站点端（TDesign）

| PHP/Twig 组件 | React 方案 |
| --- | --- |
| `layout-top-nav` 导航栏 | `Layout.Header` + `Menu` + `Dropdown` |
| 侧边栏 / 用户面板 | `Layout.Sider` + `Menu` + `Avatar` + `Tag` |
| 统计卡 `small-box` | `Card` + `Statistic` |
| 栅格 | `Row` / `Col` |
| 材质列表 / 分页 | `List` + `Pagination` + `Image` |
| 表单 | `Form` + `Input` + `Checkbox` + `Select` + `Button` |
| 验证码 | `Image`（`/auth/captcha`）+ `Input` |
| 弹窗 / 删除确认 | `Dialog` + `Form` |
| 消息提示 | `MessagePlugin` / `NotificationPlugin` |
| 上传 | `Upload`（字段 `file`，手动提交） |
| 标签页（皮肤/披风） | `Tabs` |
| 深色模式 | `ConfigProvider` + CSS 变量 |

### 5.2 管理端（antd）

| PHP/AdminLTE 组件 | React 方案 |
| --- | --- |
| 布局 | `Layout` + `Menu` + `Breadcrumb` |
| 统计卡/图表 | `Statistic` + `Card` + 内联 SVG（不引入 ECharts，保持依赖精简） |
| 表格 | `Table` + `Pagination` + `Space` |
| 筛选/搜索 | `Form` + `Input.Search` + `Select` |
| 编辑弹窗 | `Modal` + `Form` |
| 配置表单 | `Form` + `InputNumber` + `Switch` + `Select` |
| 翻译表格 | `Table` + 行内编辑 |
| 通信列表 | `Table` + `Tag` + `Popconfirm` |
| 通信编辑器 | 自定义 BlockEditor + 右侧预览 |
| 插件 | `Table`/`List` + `Card` + `Upload` |
| 更新 | `Card` + `Descriptions` + `Progress` |
| 全局提示 | `App.useApp()` |

### 5.3 对齐原则

- 字段名、提示文案、校验规则、分页参数、上传字段与 PHP 版一致；
- 语言键沿用 `auth.*`、`user.*`、`skinlib.*`、`admin.*`、`general.*`；
- 保留可测试语义钩子：`#logout-button`、`data-mark="nickname"`、`.locale`、`<main>`；
- 不复制 Twig 的 DOM 结构，但保留上述钩子供插件/第三方脚本使用。

---

## 6. 渐进切换与发布

### 6.1 每个端口的开关

```env
FRONTEND_MODE=legacy            # legacy | next
FRONTEND_NEXT_ROUTES=           # 逗号分隔的页面键，如 site:home,site:auth
```

- 命中 `next` 的页面返回 SPA 壳；其余保持现有模板。
- 全部验收后设 `FRONTEND_MODE=next`，保留 `legacy` 一个版本周期用于回滚。

P1 已落地的开关行为（四端一致）：

| `FRONTEND_MODE` | `GET /` | `GET /admin` | 其他 `/admin/*` |
| --- | --- | --- | --- |
| `legacy`（默认） | PHP 首页 | PHP 管理页 | 原样 |
| `next` | 302 → `/app-next/site/` | 302 → `/app-next/admin/` | 原样（`/admin/chart` 等 JSON 端点不受影响） |

`/app-next/{site,admin}/*` 始终可访问，便于逐页灰度；`FRONTEND_NEXT_ROUTES` 的页面级白名单尚未实现（P6）。

### 6.2 发布流程

```powershell
# 1. 构建两个 app
pnpm install --frozen-lockfile
pnpm -r build                       # apps/site/dist、apps/admin/dist

# 2. 复制到指定端口
.\scripts\publish.ps1 -Target D:\WORKspace\NeoSkin\NeoSkinGo
.\scripts\publish.ps1 -Target D:\WORKspace\NeoSkin\NeoSkin.NET
.\scripts\publish.ps1 -Target D:\WORKspace\NeoSkin\NeoSkinRS
.\scripts\publish.ps1 -Target D:\WORKspace\NeoSkin\NeoSkinSpringBoot
```

- 产物**入库**：`scripts/publish.ps1` 复制到各端口 `public/app-next/` 并提交，CI 不依赖外部前端仓库。
- 发布时写入 `public/app-next/manifest.json`：前端版本、契约版本、构建时间、文件哈希。
- 端口启动时校验 `manifest.contractVersion` 与自身实现版本，不匹配则退回 `legacy` 并告警。

---

## 7. 阶段计划（7 周）

| 阶段 | 周期 | 交付物 | 退出标准 |
| --- | --- | --- | --- |
| P0 基座 | 1 周 | workspace、两个 app 骨架、`core`/`contract`、请求层、i18n、主题、CI | `pnpm -r build` 通过；空壳页可访问；契约类型可编译 |
| P1 契约 + 认证 | 1 周 | SPA 壳读取、`/api/bootstrap` 消费、首页、登录/注册/找回/重置/验证/绑定 | **已完成（2026-11-07）**：四端壳 + bootstrap + 登录/注册/找回/重置；Playwright app-next 登录用例 |
| P2 皮肤库 | 1 周 | 浏览/详情/上传/举报、2D/3D/披风预览 | **已完成（2026-11-07）**：上传→列表→详情闭环；Go 生产构建全流程 0 console error |
| P3 用户中心 | 1 周 | 仪表盘、资料、角色、衣柜、举报、站内信、OAuth | **已完成（2026-11-07）**：前端 + 四端新增契约端点；Go 已联调，其余端口待 CI |
| P4 管理端 | 1.5 周 | 仪表盘、用户、玩家、举报、配置、翻译、插件、市场、更新 | **部分完成（2026-11-07）**：仪表盘/用户/玩家/举报/状态；Go 生产构建已联调，0 console error |
| P5 通信编辑器 | 0.5 周 | 画布、属性面板、源码导入、实时预览、撤回 | 与 `communications` 契约一致 |
| P6 切换验收 | 1 周 | `FRONTEND_MODE=next`、性能/可访问性、四端口回归、文档 | 174 路由回归通过；可一键回滚 |

> 后端补齐新增端点与前端并行；契约（`packages/contract`）在 P0 完成后冻结 v1，
> 后续只做向后兼容的增量。

---

## 8. 测试

- **单元/组件**：Vitest + Testing Library（表单校验、权限分支、空状态、分页、皮肤库卡片与提示队列）。
- **契约**：`scripts/contract-check.mjs --base <url>` 校验 SPA 壳、`/api/bootstrap`、
  `/skinlib/list` 与预览/纹理地址；四个端口共用。
- **E2E（前端仓库内）**：Playwright + MSW 模拟后端，保证前端仓库独立可测（P2 起补齐）。
- **E2E（端口内）**：四个端口仓库的 `tests/browser/flows.mjs` 使用真实后端，
  覆盖 legacy 页面 + app-next 壳/bootstrap/登录/用户中心/管理端。
- **可访问性**：axe，关键页面 0 critical（P6）。
- **性能**：Lighthouse（首页/皮肤库 LCP < 2.5s、CLS < 0.1），路由级代码分割（P6）。

---

## 9. CI

前端仓库 `.github/workflows/ci.yml`（Node 24 + pnpm 12.16.1）：

```yaml
- uses: actions/checkout@v7
- uses: actions/setup-node@v7
  with: { node-version: '24' }
- corepack enable && corepack prepare pnpm@12.16.1 --activate
- pnpm install --frozen-lockfile
- pnpm -r lint && pnpm -r test && pnpm -r build
- uses: actions/upload-artifact@v7
  with: { name: app-next, path: apps/*/dist }
```

四个端口仓库追加一步（可选但推荐）：

```yaml
- run: node NeoSkinFrontend/scripts/contract-check.mjs --base http://127.0.0.1:8080
```

（实际接入用 git submodule 或发布包；不复制前端源码进端口仓库。）

---

## 10. 风险

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 四个端口契约漂移 | 同一前端在某些端口白屏 | 契约 v1 + `contract-check.mjs` + 各端口 CI 跑 |
| 新增端点工作量大 | 管理端延期 | 先做只读列表，写操作复用既有端点；按页面灰度 |
| CSRF/session 差异 | 419/401 频发 | 壳注入 meta + 统一拦截器；每端口 E2E 覆盖 |
| 静态托管路径不同 | 资源 404 | `basePath` 由 bootstrap 提供，而非写死 |
| 主题/深色模式差异 | 视觉割裂 | `core/theme` 统一输出两套 token，颜色取站点选项 |
| 插件依赖 DOM | 插件失效 | 保留钩子 + `window.blessing`；插件菜单/徽章/资源走 bootstrap |
| 上游 PHP 版本变化 | 契约过期 | 以 6.0.11_patch 冻结；升级另立契约 v2 |
| TS 7 / React Router 8 变化 | 构建或路由回归 | 已升 TS 7.0.2；路由不兼容回退 7.18.5 |

---

## 11. 验收清单

- [ ] `apps/site`、`apps/admin` 独立构建/部署，版本与本文一致
- [ ] 页面路由与 PHP 版一一对应；壳路径、静态前缀正确
- [ ] bootstrap 注入与 `/api/bootstrap` 两条路径都能启动
- [ ] 登录态、CSRF、401/419/403、语言、深色模式正确
- [x] 皮肤库上传/详情/预览/举报闭环（P2，Go 生产构建 + 浏览器验证）
- [x] 用户中心（资料/角色/衣柜/举报/站内信/OAuth）闭环
- [ ] 管理端 CRUD、通信发布/撤回、插件、更新闭环
- [ ] 字段/文案/语言键与 PHP 版一致
- [ ] 四个端口 `contract-check` 全绿；Playwright 全绿
- [ ] `FRONTEND_MODE` 可一键回滚 `legacy`
- [ ] 文档：契约、接入、版本、发布同步

---

## 12. 端口接入责任

| 端口 | 需要做的事 |
| --- | --- |
| NeoSkinGo | 壳路由 + bootstrap 注入 + 新增 JSON 端点 + 静态托管 + 复制脚本参数 |
| NeoSkin.NET | 同上（ASP.NET Core 中间件/端点） |
| NeoSkinSpringBoot | 同上（Spring MVC Controller/Filter） |
| NeoSkinRS | 同上（Suprnova 路由/中间件） |

每个端口只需实现一次契约，前端不用为端口写分支。
