# 后端部署说明

当前后端使用 Node.js 原生 HTTP 服务和 Node 内置 SQLite。它已经具备基础持久化、密码哈希、token 登录、角色校验、审计日志、上传凭证落盘和业务参数校验。Node 22 会对内置 SQLite 输出实验性提示，服务可正常运行；生产环境建议固定 Node 版本并在升级前回归测试。

## 本地运行

```bash
npm install
npm run backend:dev
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

## 核心接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/meta` | 服务元信息、角色、快递配置 |
| `POST` | `/api/auth/login` | mock 登录 |
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

## 当前限制

- 当前内置四个初始账号，首次启动会写入 SQLite；后续应增加用户管理和改密流程。
- 文件上传保存在本机目录；多服务器部署时建议迁移到对象存储。
- 暂未接真实物流官网 API。

## 阿里云 IP 部署

部署到 `47.242.190.166` 的完整说明见 [aliyun-deployment.md](./aliyun-deployment.md)。
