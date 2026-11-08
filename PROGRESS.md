# NeoSkinFrontend 进度

> 与 `PLAN.md` 配套的逐轮记录。后端进度见各端口仓库的 `PROGRESS.md`。

## 2026-11-06 — P0 基础设施
- 建立 pnpm monorepo：`apps/site`（TDesign）、`apps/admin`（antd）、`packages/core`、`packages/contract`。
- 契约 v1、SPA 壳注入、`GET /api/bootstrap`、legacy 回退开关。

## 2026-11-07 — P1 站点壳
- 站点布局、导航、登录/注册/找回/重置、皮肤库列表与详情、`FRONTEND_MODE=next` 跳转。

## 2026-11-07 — P2 皮肤库
- 列表筛选/排序/分页、详情 2D/3D/披风预览、上传（尺寸/积分/重名）、举报。
- 衣柜、材质改名/类型/隐私/删除、重名对话框。

## 2026-11-07 — P3 用户中心
- 仪表盘/资料/角色/衣柜/站内信/举报/OAuth2 应用。
- 四个后端新增 `GET /api/user/inbox`、`/api/user/inbox/{id}`、`/api/user/reports`。

## 2026-11-07 — P4 管理端
- 仪表盘、用户、角色、举报、i18n、插件、市场、选项、状态、更新页。
- 四个后端新增 `GET /api/admin/dashboard`、`GET|PUT /api/admin/options/{group}`、`GET /api/admin/update/info`。

## 2026-11-07 — P5 通信
- `/communications` 列表、区块编辑器、草稿/发布/撤回。
- 管理端请求头 `X-Neoskin-Spa: 1` 触发 JSON 写入响应。

## 2026-11-08 — bootstrap 功能开关与验证门禁
- `packages/contract` 的 `BootstrapOptions` 增加 `allow_downloading_texture`、
  `require_verification`、`player_name_length_min/max`、`user_initial_score`、`return_score`、
  `sign_after_zero`、`sign_gap_time`、`reporter_score_modification`、`reporter_reward_score`。
- 站点端新增 `lib/verification.ts` 与 `components/VerificationNotice.tsx`：
  未验证用户在用户中心/上传页看到提示条，角色、OAuth、上传、举报写操作禁用。
- 材质详情按 `allow_downloading_texture` 隐藏下载；角色名长度提示与预校验读 bootstrap；
  举报页显示暂扣/奖励积分提示。
- 四个后端 bootstrap 全部补齐上述键；Go/Rust 补 `verified` 路由检查，.NET/Spring 沿用中间件。
- 验证：前端 `pnpm -r typecheck` / `pnpm -r test` / `contract-check` 全绿；
  Go 浏览器联调 403/200 行为符合 PHP，0 console error。

## 2026-11-08 — P6 切换验收（进行中）
- Go `FRONTEND_MODE=next`：`GET /` → `/app-next/site/`、`GET /admin` → `/app-next/admin/`；
  `FRONTEND_MODE=legacy` 回滚后 `/` 返回 legacy 页面（`#blessing-extra`），SPA 路径仍可访问。
- 174 路由回归冒烟：按 `conformance/data/routes.json` 请求 78 条 GET 路由，
  0 个 500；其余为 200/302/401/403/404（未登录、示例参数或权限所致）。
- 站点/管理端 11 个页面逐页浏览器检查：0 console error；“插件/市场”实际路径为
  `/plugins/manage`、`/plugins/market`。
- 路由级代码分割：站点入口 832 KB → 291 KB（gzip 254 → 92 KB），
  材质详情/用户中心/管理端各页按需加载；`route-loading` 占位。
- 性能基线：本地 DCL/load 约 50–80 ms，CLS 0；静态资源由端口直接输出（未压缩），
  生产建议由反向代理启用 gzip/brotli。
- 无障碍：axe（WCAG 2 A/AA）扫描 9 个关键页面 0 violation；修复管理端选项表单
  20 个无标签输入 + 5 个无名称开关（`aria-label`）、antd 对比度 token、
  TDesign 描边按钮与禁用按钮文字色。
- Playwright 浏览器 E2E（`NEOSKIN_BROWSER_E2E=1`）：Go / .NET / Spring / Rust 四端全部通过。
- `contract-check.mjs`：四个端口（8099 / 8788 / 8799 / 8777）全部通过；
  过程中发现并修复 Spring 未挂载契约读取端点的问题。
- 待办：CI 推送后跑平台矩阵（macOS / Windows / Linux × x64 / aarch64）。

## 2026-11-08 — NeoSkin 品牌与独立发布

- 站点默认描述、管理端“运行状态”卡片标题改为 NeoSkin；后端默认 `site_name` /
  `site_description` / `announcement` 与安装向导同步品牌化（版权署名保留上游）。
- 新增独立前端 Release：推送 `v*` tag 生成
  `neoskin-frontend_<version>.zip`（`app-next/{site,admin}` + `manifest.json`）。
- 发布包附带 `deploy/nginx.conf`、`deploy/Caddyfile`、`deploy/DEPLOY.md`，
  支持纯静态托管 + 反代任一后端。
- 验证：`pnpm -r typecheck/test/build` 全绿；本地打包确认 `app-next` + `deploy/*` 结构正确。
- 管理端写操作回归（Go 本机）：用户昵称/邮箱/积分/权限/验证状态/密码/删除，
  角色改名/转移/材质/删除，举报审核，选项保存，通信草稿/发布/撤回，
  翻译新增/更新/删除全部返回 `code:0`；修改自己的权限按 PHP 语义返回 403。
- 插件列表为空、市场列表与更新检查正常；插件启停/更新下载安装因本地无插件/非落后版本未执行。
- GitHub Release `v0.1.0` 已发布：`neoskin-frontend_0.1.0.zip`（app-next + Nginx/Caddy 配置）。
- 管理端更新安装回归发现并修复：SPA 安装未传 `package.id`，且 Go/Spring 只返回 302；
  现 `installUpdate` 传递 id，Go/Spring 对 SPA 请求返回 JSON。
- 专用环境验证插件启停（manifest 插件 enable/disable）与更新下载/安装
  （本地 update.json + 6.0.12_patch ZIP → 下载校验 → 安装 → 标记文件落盘）。
- Patch Release `v0.1.1` 已发布：`neoskin-frontend_0.1.1.zip`（更新安装 id 修复）。
- 管理端状态页联调：`fetchStatus` 使用 `Accept: application/json` 请求 `/admin/status`；
  .NET / Spring / Rust 补齐内容协商后，四端状态页均能展示本实现版本与运行时信息。
- 契约文档同步修正状态端点为 `/admin/status`（带内容协商），与代码一致。
