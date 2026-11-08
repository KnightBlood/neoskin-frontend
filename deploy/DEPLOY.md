# 独立前端部署

共享前端可以独立发布，不必和某个后端仓库绑定。发布包结构：

```text
neoskin-frontend_<version>.zip
├── app-next/
│   ├── site/          # 公开站 SPA
│   ├── admin/         # 管理端 SPA
│   └── manifest.json  # 入口与 CSS 清单
└── deploy/
    ├── nginx.conf
    ├── Caddyfile
    └── DEPLOY.md
```

## 发布

推送 `v*` tag 后由 `.github/workflows/release.yml` 自动构建并上传 Release：

```bash
git tag v0.1.0
git push origin v0.1.0
```

产物：`neoskin-frontend_<version>.zip`。

## 部署

1. 解压到静态目录，例如 `/var/www/neoskin`，保证 `app-next/` 位于根目录。
2. 选择一个反向代理配置：
   - Nginx：`deploy/nginx.conf`
   - Caddy：`deploy/Caddyfile`
3. 把配置里的后端地址改成实际端口：
   - Go 默认 `8080`
   - .NET 示例 `8788`
   - Spring 示例 `8799`
   - Rust 默认 `8765`
4. 重新加载代理，访问 `https://你的域名/app-next/site/` 与 `/app-next/admin/`。

## 要点

- 壳（`index.html`）不缓存；`assets/*` 带 hash，可长缓存。
- 所有 `/api/*`、`/auth/*`、`/user/*`、`/admin`、`/skinlib/*`、`/texture*`、`/oauth/*`、
  `/lang/*` 等动态请求必须反代到同一个后端，否则 Cookie 与 CSRF 不一致。
- 上传请求体上限建议 ≥ `max_upload_file_size`，示例配置为 1100 MB。
- 前端只依赖 `GET /api/bootstrap` 与 SPA 壳，四个后端端口可互换。
