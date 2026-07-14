#!/bin/sh
set -eu

mkdir -p backups
stamp="$(date +%Y%m%d_%H%M%S)"
docker compose exec -T postgres pg_dump -U constructos -d constructos -Fc > "backups/constructos_${stamp}.dump"
find backups -type f -name 'constructos_*.dump' -mtime +14 -delete
echo "Đã tạo backups/constructos_${stamp}.dump"
