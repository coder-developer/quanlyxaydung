#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/quanlyxaydung}"
REPO_URL="${REPO_URL:-https://github.com/coder-developer/quanlyxaydung.git}"
REPO_REF="${REPO_REF:-v1.1.2}"
APP_PORT="${APP_PORT:-8080}"
DOMAIN="${DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"

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

set_env_value() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

install_packages

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker 2>/dev/null || service docker start
docker compose version >/dev/null

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || true)"
case "$0" in
  */install-vps.sh|install-vps.sh) local_package=true ;;
  *) local_package=false ;;
esac
if [ "$local_package" = true ] && [ -n "$script_dir" ] && [ -f "$script_dir/docker-compose.yml" ]; then
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

if [ -n "$DOMAIN" ]; then
  echo "$DOMAIN" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$' || { echo "Tên miền không hợp lệ: $DOMAIN" >&2; exit 1; }
  case "$DOMAIN" in
    *.*) ;;
    *) echo "Tên miền phải là FQDN, ví dụ erp.tencongty.vn." >&2; exit 1 ;;
  esac
  [ -n "$ACME_EMAIL" ] || ACME_EMAIL="admin@$DOMAIN"
  install_url="https://$DOMAIN"
else
  install_url="http://$(hostname -I 2>/dev/null | awk '{print $1}'):$APP_PORT"
fi

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
APP_BIND=${DOMAIN:+127.0.0.1}
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
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
EOF
  chmod 600 .env

  cat > .installation-credentials <<EOF
URL=$install_url
CEO username=CEO
CEO initial password=$ceo_pin
Created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  chmod 600 .installation-credentials
fi

if [ -n "$DOMAIN" ]; then
  set_env_value APP_BIND 127.0.0.1
  set_env_value DOMAIN "$DOMAIN"
  set_env_value ACME_EMAIL "$ACME_EMAIL"
  if [ -f .installation-credentials ]; then
    sed -i "s|^URL=.*|URL=https://$DOMAIN|" .installation-credentials
  fi

  resolved_ip="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR == 1 { print $1 }')"
  public_ip="$(curl -4fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
  if [ -z "$resolved_ip" ]; then
    echo "Cảnh báo: DNS của $DOMAIN chưa phân giải. Hãy kiểm tra bản ghi A." >&2
  elif [ -n "$public_ip" ] && [ "$resolved_ip" != "$public_ip" ]; then
    echo "Cảnh báo: DNS trả về $resolved_ip, còn IP công khai VPS là $public_ip. Có thể hợp lệ nếu dùng Cloudflare proxy." >&2
  fi

  if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then
    ufw allow 80/tcp
    ufw allow 443/tcp
  fi
  if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
  fi

  docker compose -f docker-compose.yml -f docker-compose.domain.yml up -d --build
else
  set_env_value APP_BIND 0.0.0.0
  docker compose up -d --build
fi

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
if [ -n "$DOMAIN" ]; then
  https_attempt=0
  until curl -fsS --max-time 15 "https://$DOMAIN/api/health" >/dev/null 2>&1; do
    https_attempt=$((https_attempt + 1))
    if [ "$https_attempt" -ge 60 ]; then
      docker compose -f docker-compose.yml -f docker-compose.domain.yml logs --tail 100 caddy
      echo "Ứng dụng nội bộ đã chạy nhưng HTTPS chưa sẵn sàng. Kiểm tra DNS và firewall cổng 80/443." >&2
      exit 1
    fi
    sleep 3
  done
  echo "Cài đặt hoàn tất: https://$DOMAIN"
else
  echo "Cài đặt hoàn tất: http://${ip:-127.0.0.1}:$APP_PORT"
fi
echo "Thông tin đăng nhập ban đầu: $APP_DIR/.installation-credentials"
echo "Đổi mật khẩu CEO ngay sau lần đăng nhập đầu tiên."
echo "Để backup ra ngoài VPS, cấu hình BACKUP_REMOTE trong .env và rclone."
