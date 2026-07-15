#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/quanlyxaydung}"
REPO_URL="${REPO_URL:-https://github.com/coder-developer/quanlyxaydung.git}"
REPO_REF="${REPO_REF:-v1.1.0}"
APP_PORT="${APP_PORT:-8080}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Vui lòng chạy bằng root: sudo sh install-vps.sh" >&2
  exit 1
fi

install_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git openssl cron
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl git openssl cronie
    systemctl enable --now crond || true
  elif command -v yum >/dev/null 2>&1; then
    yum install -y ca-certificates curl git openssl cronie
    systemctl enable --now crond || true
  else
    echo "Chỉ hỗ trợ VPS Ubuntu/Debian/RHEL có apt, dnf hoặc yum." >&2
    exit 1
  fi
}

random_secret() {
  openssl rand -hex "$1"
}

install_packages

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker 2>/dev/null || service docker start
docker compose version >/dev/null

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || true)"
if [ -n "$script_dir" ] && [ -f "$script_dir/docker-compose.yml" ]; then
  APP_DIR="$script_dir"
else
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch --prune origin
    git -C "$APP_DIR" checkout "$REPO_REF"
    git -C "$APP_DIR" pull --ff-only origin "$REPO_REF"
  else
    if [ -e "$APP_DIR" ]; then
      echo "$APP_DIR đã tồn tại nhưng không phải Git repository; dừng để bảo vệ dữ liệu." >&2
      exit 1
    fi
    tmp_dir="$(mktemp -d)"
    git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$tmp_dir/app"
    mkdir -p "$(dirname "$APP_DIR")"
    mv "$tmp_dir/app" "$APP_DIR"
    rmdir "$tmp_dir"
  fi
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  umask 077
  postgres_password="$(random_secret 24)"
  jwt_secret="$(random_secret 32)"
  ceo_pin="$(random_secret 6)"
  accountant_pin="$(random_secret 6)"
  site_manager_pin="$(random_secret 6)"
  auditor_pin="$(random_secret 6)"
  employee_pin="$(random_secret 6)"

  cat > .env <<EOF
APP_PORT=$APP_PORT
POSTGRES_PASSWORD=$postgres_password
JWT_SECRET=$jwt_secret
SEED_CEO_PIN=$ceo_pin
SEED_ACCOUNTANT_PIN=$accountant_pin
SEED_SITE_MANAGER_PIN=$site_manager_pin
SEED_AUDITOR_PIN=$auditor_pin
SEED_EMPLOYEE_PIN=$employee_pin
OTP_WEBHOOK_URL=
OTP_WEBHOOK_TOKEN=
BACKUP_REMOTE=
EOF
  chmod 600 .env

  cat > .installation-credentials <<EOF
URL=http://$(hostname -I 2>/dev/null | awk '{print $1}'):$APP_PORT
CEO username=CEO
CEO initial password=$ceo_pin
Created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  chmod 600 .installation-credentials
fi

docker compose up -d --build

attempt=0
until curl -fsS "http://127.0.0.1:$APP_PORT/api/health" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    docker compose logs --tail 100 app
    echo "Ứng dụng chưa vượt qua health check." >&2
    exit 1
  fi
  sleep 2
done

if command -v crontab >/dev/null 2>&1; then
  sh scripts/install-backup-cron.sh
fi

ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "Cài đặt hoàn tất: http://${ip:-127.0.0.1}:$APP_PORT"
echo "Thông tin đăng nhập ban đầu: $APP_DIR/.installation-credentials"
echo "Đổi mật khẩu CEO ngay sau lần đăng nhập đầu tiên."
echo "Để backup ra ngoài VPS, cấu hình BACKUP_REMOTE trong .env và rclone."
