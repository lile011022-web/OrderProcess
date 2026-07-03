# 后端部署说明

当前后端使用 Node.js 原生 HTTP 服务和 Node 内置 SQLite。它已经具备基础持久化、密码哈希、token 登录、登录页改密、角色校验、审计日志、上传凭证落盘、业务参数校验、认证限流和基础安全响应头。Node 22 会对内置 SQLite 输出实验性提示，服务可正常运行；生产环境建议固定 Node 版本并在升级前回归测试。

## 本地运行

```bash
npm install
npm run backend:dev
npm run backend:clear-business-data
```

默认监听：

```text
http://127.0.0.1:7301
```

自检：

```bash
npm run backend:check
```

如需检查其他服务器地址：

```bash
API_BASE_URL=https://api.example.com npm run backend:check
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `7301` | 后端监听端口 |
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `CORS_ORIGIN` | `*` | 允许访问 API 的前端来源 |
| `DATA_DIR` | `data` | SQLite 数据文件目录 |
| `DB_PATH` | `data/order-process.sqlite` | SQLite 数据库路径 |
| `UPLOAD_DIR` | `uploads` | 上传凭证保存目录 |
| `TOKEN_SECRET` | `dev-change-me-before-production` | token 签名密钥，生产必须修改 |
| `SEED_DEMO_DATA` | 未设置 | 只有显式设置为 `true` 才写入业务演示数据，生产必须保持 `false` 或不设置 |
| `AUTH_RATE_LIMIT_MAX` | `8` | 单个 IP + 用户名在窗口期内允许的登录/改密尝试次数 |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | 认证限流窗口，默认 15 分钟 |

## 清除测试数据

生产环境首次部署或演示结束后，执行：

```bash
cd /opt/order-process
SEED_DEMO_DATA=false npm run backend:clear-business-data
systemctl restart order-process-backend
```

该命令会清除采购任务、买手回填、包裹、异常、商品资料、仓库地址、对账记录和上传凭证记录，默认也会删除 `UPLOAD_DIR` 内的上传文件。它不会删除用户账号。需要连审计日志一起清除时：

```bash
CLEAR_AUDIT=true npm run backend:clear-business-data
```

生产环境不要设置 `SEED_DEMO_DATA=true`，否则空库启动时会重新写入演示业务数据。

## 核心接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/meta` | 服务元信息、角色、快递配置 |
| `POST` | `/api/auth/login` | 登录 |
| `POST` | `/api/auth/change-password` | 使用旧密码修改为强密码 |
| `GET` | `/api/auth/me` | 当前登录用户 |
| `GET` | `/api/navigation?role=admin` | 按角色获取菜单 |
| `GET` | `/api/tasks` | 采购任务 |
| `GET` | `/api/buyer-fill-records` | 买手回填 |
| `GET` | `/api/packages` | 包裹列表 |
| `POST` | `/api/packages/:id/confirm-received` | 仓库确认收货，待确认金额转实际入库成本 |
| `GET` | `/api/packages/exceptions` | 异常包裹 |
| `POST` | `/api/packages/exceptions/:id/resolve` | 保存异常处理结果 |
| `GET` | `/api/reconciliation` | 对账记录 |
| `GET` | `/api/products` | 商品资料 |
| `GET` | `/api/warehouses` | 仓库地址 |
| `GET` | `/api/warehouse-fees/calculate?packageCount=2&photoCount=3` | 仓库费用计算 |
| `GET` | `/api/tracking?trackingNo=...` | 运单识别与官网查询地址 |
| `POST` | `/api/uploads` | 上传图片/PDF 凭证 |
| `GET` | `/api/uploads?targetKind=package&targetId=...` | 查看凭证 |
| `GET` | `/api/audit-logs` | 审计日志，管理员可用 |

## Docker 部署

```bash
docker build -f Dockerfile.backend -t order-process-backend:1.2 .
docker run -d \
  --name order-process-backend \
  --restart unless-stopped \
  -p 7301:7301 \
  -e CORS_ORIGIN=https://your-frontend-domain.com \
  -e TOKEN_SECRET=replace-with-long-random-secret \
  -v order-process-data:/app/data \
  -v order-process-uploads:/app/uploads \
  order-process-backend:1.2
```

验证：

```bash
curl http://127.0.0.1:7301/health
```

## systemd 部署

服务器安装 Node.js 20+ 后：

```bash
git clone https://github.com/lile011022-web/OrderProcess.git /opt/order-process
cd /opt/order-process
PORT=7301 HOST=127.0.0.1 npm run backend:dev
```

systemd 示例：

```ini
[Unit]
Description=OrderProcess Backend
After=network.target

[Service]
WorkingDirectory=/opt/order-process
ExecStart=/usr/bin/node /opt/order-process/server/index.mjs
Restart=always
Environment=NODE_ENV=production
Environment=PORT=7301
Environment=HOST=127.0.0.1
Environment=CORS_ORIGIN=https://your-frontend-domain.com
Environment=TOKEN_SECRET=replace-with-long-random-secret
Environment=SEED_DEMO_DATA=false
Environment=DATA_DIR=/opt/order-process/data
Environment=UPLOAD_DIR=/opt/order-process/uploads

[Install]
WantedBy=multi-user.target
```

## Nginx 反向代理

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:7301;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location /health {
  proxy_pass http://127.0.0.1:7301;
}
```

## 安全加固清单

- 生产必须把 `HOST` 固定为 `127.0.0.1`，不要把 `7301` 后端端口直接暴露公网。
- 阿里云安全组只开放必要端口：`80/443` 给公网，`22` 只允许你的固定公网 IP。
- `/etc/order-process/order-process.env` 权限保持 `600`，`TOKEN_SECRET` 使用随机长字符串。
- 首次登录后立即在登录页修改 `admin`、`buyer`、`warehouse`、`customer` 四个初始账号密码。
- 使用 HTTPS 域名后，把 `CORS_ORIGIN` 改成正式域名，并给 Nginx 配置证书。
- 定期备份 SQLite 数据库、上传目录和环境变量文件。
- 这次加固能显著降低暴力破解风险，但不能保证“绝对不会被破解”；后续建议增加用户管理、二次验证、HTTPS 和登录告警。

## 当前限制

- 当前内置四个初始账号，首次启动会写入 SQLite；生产必须首次登录后修改默认密码。
- 文件上传保存在本机目录；多服务器部署时建议迁移到对象存储。
- 暂未接真实物流官网 API。

## 阿里云 IP 部署

部署到 `47.242.190.166` 的完整说明见 [aliyun-deployment.md](./aliyun-deployment.md)。
