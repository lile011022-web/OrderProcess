#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/order-process}"
REPO_URL="${REPO_URL:-https://github.com/lile011022-web/OrderProcess.git}"
BRANCH="${BRANCH:-main}"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"
NPM_BIN="${NPM_BIN:-/usr/bin/npm}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "请用 root 执行，或使用 sudo bash scripts/deploy_aliyun.sh"
  exit 1
fi

install_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y "$@"
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y "$@"
    return
  fi
  if command -v yum >/dev/null 2>&1; then
    yum install -y "$@"
    return
  fi
  echo "未找到 apt-get/dnf/yum，请手动安装：$*"
  exit 1
}

if ! command -v git >/dev/null 2>&1; then
  install_packages git
fi

if ! command -v nginx >/dev/null 2>&1; then
  install_packages nginx
fi

if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js。请先安装 Node.js 22+ 后重试。"
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "当前 Node.js 版本为 $(node -v)，需要 Node.js 22+ 才能使用内置 SQLite。"
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
fi

mkdir -p /etc/order-process "$APP_DIR/data" "$APP_DIR/uploads"
chmod 700 /etc/order-process

if [[ ! -f /etc/order-process/order-process.env ]]; then
  TOKEN_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
  cat >/etc/order-process/order-process.env <<EOF
TOKEN_SECRET=$TOKEN_SECRET
CORS_ORIGIN=http://47.242.190.166
EOF
  chmod 600 /etc/order-process/order-process.env
fi

cd "$APP_DIR"
"$NPM_BIN" ci
VITE_API_BASE_URL="" "$NPM_BIN" run build

cp "$APP_DIR/deploy/order-process-backend.service" /etc/systemd/system/order-process-backend.service

if [[ -d /etc/nginx/sites-available && -d /etc/nginx/sites-enabled ]]; then
  cp "$APP_DIR/deploy/order-process.nginx.conf" /etc/nginx/sites-available/order-process.conf
  ln -sfn /etc/nginx/sites-available/order-process.conf /etc/nginx/sites-enabled/order-process.conf
  rm -f /etc/nginx/sites-enabled/default
else
  cp "$APP_DIR/deploy/order-process.nginx.conf" /etc/nginx/conf.d/order-process.conf
fi

systemctl daemon-reload
systemctl enable order-process-backend
systemctl restart order-process-backend
nginx -t
systemctl reload nginx

echo "部署完成。"
echo "后端健康检查：curl http://127.0.0.1:7301/health"
echo "公网访问：http://47.242.190.166"
