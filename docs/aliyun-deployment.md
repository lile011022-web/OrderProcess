# 阿里云服务器部署说明

目标服务器：`47.242.190.166`

本项目推荐在服务器上使用：

- Nginx：对外提供前端静态页面，并把 `/api` 和 `/health` 反向代理到后端。
- systemd：守护 Node.js 后端服务。
- SQLite：默认数据文件 `/opt/order-process/data/order-process.sqlite`。
- 上传目录：`/opt/order-process/uploads`。

## 1. 当前连接诊断

从本机测试结果：

- `47.242.190.166` 可以 ping 通。
- TCP 端口 `22/80/443/7301/8080/3000` 能建立连接。
- SSH 连接在 banner 阶段超时：`Connection timed out during banner exchange`。
- HTTP 端口能建立连接但没有正常响应。

这说明当前阻塞点不是 GitHub 或项目代码，而是服务器 SSH 服务、安全组、防火墙或端口代理状态。需要先在阿里云控制台确认：

- ECS 安全组入方向允许你的当前公网 IP 访问 TCP `22`。
- 服务器内 `sshd` 正常运行。
- 端口 `22` 没有被其他程序占用或代理。
- 如果 SSH 使用了非 22 端口，需要提供实际端口。

## 2. 服务器准备

登录服务器后，建议先确认系统：

```bash
uname -a
cat /etc/os-release
```

安装基础组件：

```bash
apt-get update
apt-get install -y git nginx curl ca-certificates
```

安装 Node.js 22+。后端依赖 Node 内置 SQLite，因此 Node 版本必须是 22 或更高：

```bash
node -v
```

如果还没安装 Node.js，可使用你常用方式安装 Node.js 22 LTS 或更新版本。

## 3. 一键部署脚本

在服务器上执行：

```bash
git clone https://github.com/lile011022-web/OrderProcess.git /opt/order-process
cd /opt/order-process
bash scripts/deploy_aliyun.sh
```

如果已经 clone 过：

```bash
cd /opt/order-process
git pull --ff-only origin main
bash scripts/deploy_aliyun.sh
```

脚本会完成：

- 拉取最新代码。
- 创建 `/etc/order-process/order-process.env`。
- 自动生成 `TOKEN_SECRET`。
- 写入 `SEED_DEMO_DATA=false` 和登录/改密限流配置。
- 安装 npm 依赖。
- 使用同域 API 构建前端：`VITE_API_BASE_URL="" npm run build`。
- 安装 systemd 服务：`order-process-backend`。
- 安装 Nginx 配置。
- 启动后端并 reload Nginx。

## 4. systemd 服务

服务文件位置：

```text
/etc/systemd/system/order-process-backend.service
```

仓库模板：

```text
deploy/order-process-backend.service
```

常用命令：

```bash
systemctl status order-process-backend
journalctl -u order-process-backend -n 100 --no-pager
systemctl restart order-process-backend
```

## 5. Nginx 配置

仓库模板：

```text
deploy/order-process.nginx.conf
```

安装后位置：

```text
/etc/nginx/sites-available/order-process.conf
/etc/nginx/sites-enabled/order-process.conf
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

## 6. 验证

服务器本机验证：

```bash
curl http://127.0.0.1:7301/health
curl http://127.0.0.1/health
```

公网验证：

```bash
curl http://47.242.190.166/health
```

浏览器访问：

```text
http://47.242.190.166
```

初始账号：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `123456` |
| 买手 | `buyer` | `123456` |
| 仓库 | `warehouse` | `123456` |
| 客户 | `customer` | `123456` |

生产使用前必须在登录页点击“修改密码”，把四个初始账号全部改成强密码。

## 7. 清除测试数据

v1.2.1 起生产默认不会自动写入业务演示数据。如果当前服务器已经有测试数据，登录服务器执行：

```bash
cd /opt/order-process
SEED_DEMO_DATA=false npm run backend:clear-business-data
systemctl restart order-process-backend
```

执行后再验证：

```bash
curl http://127.0.0.1/health
```

该命令不会删除四个登录账号，只会清除采购、包裹、异常、商品资料、对账和上传凭证等业务测试数据；`最新地址.docx` 中的 7 个美国仓库地址会自动保留/恢复。

## 8. 最新地址基础资料

部署 v1.3.3 后，`最新地址.docx` 中的 7 个美国仓库地址会作为系统基础资料自动存在，不依赖演示数据开关。如果服务器旧页面仍显示 0 条，可兜底执行：

```bash
cd /opt/order-process
git pull --ff-only origin main
bash scripts/deploy_aliyun.sh
SEED_DEMO_DATA=false npm run backend:import-latest-addresses
systemctl restart order-process-backend
```

然后用管理员登录，进入“仓库地址”，确认 DE Newark、DE Bear、DE Wilmington、PA Philadelphia 等最新地址都为“启用”。

## 9. 防破解与安全组

必须确认：

- 阿里云安全组：公网只开放 `80/443`，`22` 只允许你的固定公网 IP。
- 不要开放 `7301`，后端只监听 `127.0.0.1:7301`，由 Nginx 转发 `/api` 和 `/health`。
- `/etc/order-process/order-process.env` 权限为 `600`，不要截图或公开 `TOKEN_SECRET`。
- 登录页修改四个初始账号密码，强密码至少 10 位，包含大小写字母、数字和特殊符号。
- 正式使用建议绑定域名并配置 HTTPS 证书，之后把 `CORS_ORIGIN` 改为正式域名。
- 定期备份数据；发现异常登录或大量 401/429 时，立即更换密码和 `TOKEN_SECRET`。

系统已经增加登录/改密限流、强密码校验、Nginx 限流、安全响应头和 systemd 基础沙箱，但任何公网系统都不能承诺绝对不会被破解。安全组、强密码、HTTPS、备份和持续更新必须一起做。

## 10. 数据与备份

需要备份：

```text
/opt/order-process/data/order-process.sqlite
/opt/order-process/uploads
/etc/order-process/order-process.env
```

建议每天定时备份：

```bash
mkdir -p /opt/order-process-backups
tar -czf /opt/order-process-backups/order-process-$(date +%F).tar.gz \
  /opt/order-process/data \
  /opt/order-process/uploads \
  /etc/order-process/order-process.env
```

## 11. 当前需要你确认的信息

为了让我直接完成远程部署，请提供以下任一方式：

- SSH 用户名、端口、密码；或
- SSH 用户名、端口、私钥路径；或
- 阿里云控制台临时远程连接方式。

当前我尝试过：

```bash
ssh root@47.242.190.166
ssh admin@47.242.190.166
```

结果均为 SSH banner 阶段超时。
