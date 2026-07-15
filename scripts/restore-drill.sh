#!/bin/sh
set -eu

file="${1:-$(find backups -type f -name 'constructos_*.dump' | sort | tail -n 1)}"
test -n "$file" && test -s "$file"
test -f "${file}.sha256" && sha256sum -c "${file}.sha256"

database="constructos_restore_drill"
docker compose exec -T postgres dropdb -U constructos --if-exists "$database"
docker compose exec -T postgres createdb -U constructos "$database"
trap 'docker compose exec -T postgres dropdb -U constructos --if-exists "$database" >/dev/null 2>&1 || true' EXIT
docker compose exec -T postgres pg_restore -U constructos -d "$database" --no-owner --no-privileges < "$file"
docker compose exec -T postgres psql -U constructos -d "$database" -v ON_ERROR_STOP=1 -c "SELECT revision FROM erp_state WHERE id=1; SELECT COUNT(*) AS users FROM app_users; SELECT COUNT(*) AS audit_rows FROM audit_log;"
echo "Diễn tập khôi phục thành công từ $file"
