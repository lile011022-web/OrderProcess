# 后端部署说明

当前后端是 v1.1 mock API 部署层，使用 Node.js 原生 HTTP 服务实现，不依赖第三方运行库，不连接真实数据库。它用于先把登录、菜单、采购、包裹、异常、费用和对账接口部署出来，后续可逐步替换为数据库和真实鉴权。

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

## 核心接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查 |
| `GET` | `/api/meta` | 服务元信息、角色、快递配置 |
| `POST` | `/api/auth/login` | mock 登录 |
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

## Docker 部署

```bash
docker build -f Dockerfile.backend -t order-process-backend:1.1 .
docker run -d \
  --name order-process-backend \
  --restart unless-stopped \
  -p 7301:7301 \
  -e CORS_ORIGIN=https://your-frontend-domain.com \
  order-process-backend:1.1
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

- 数据来自 `server/mockData.mjs`，服务重启后 POST 状态变化会恢复初始 mock 数据。
- 登录是 mock 登录，不发真实 token。
- 还没有真实数据库、审计日志、文件上传存储和生产级权限校验。
