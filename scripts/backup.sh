#!/bin/sh
set -eu

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

mkdir -p backups
stamp="$(date +%Y%m%d_%H%M%S)"
file="backups/constructos_${stamp}.dump"
docker compose exec -T postgres pg_dump -U constructos -d constructos -Fc > "$file"
test -s "$file"
sha256sum "$file" > "${file}.sha256"
if [ -n "${BACKUP_REMOTE:-}" ]; then
  command -v rclone >/dev/null 2>&1 || { echo "Thiếu rclone để sao lưu ngoài VPS." >&2; exit 1; }
  rclone copy "$file" "$BACKUP_REMOTE" --checksum
  rclone copy "${file}.sha256" "$BACKUP_REMOTE" --checksum
fi
find backups -type f -name 'constructos_*.dump' -mtime +14 -delete
find backups -type f -name 'constructos_*.sha256' -mtime +14 -delete
echo "Đã tạo và kiểm tra $file${BACKUP_REMOTE:+; đã sao chép tới $BACKUP_REMOTE}"
