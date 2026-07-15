#!/bin/sh
set -eu

root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
log="$root/backups/backup-cron.log"
mkdir -p "$root/backups"
backup_job="15 2 * * * cd '$root' && sh scripts/backup.sh >> '$log' 2>&1"
drill_job="30 3 * * 0 cd '$root' && sh scripts/restore-drill.sh >> '$log' 2>&1"
(crontab -l 2>/dev/null | grep -v 'scripts/backup.sh' | grep -v 'scripts/restore-drill.sh'; echo "$backup_job"; echo "$drill_job") | crontab -
echo "Đã cài backup hằng ngày 02:15 và diễn tập khôi phục Chủ nhật 03:30."
