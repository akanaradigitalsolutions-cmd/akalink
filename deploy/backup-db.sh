#!/usr/bin/env bash
# ============================================================================
#  AkaLink — backup harian database (pg_dump) untuk Supabase Free (tanpa Pro).
#  - Dump seluruh DB -> gzip -> $OUTDIR
#  - Simpan $KEEP backup terbaru (rotasi otomatis)
#  - Opsional unggah ke GCS bila $BUCKET diisi & gsutil tersedia (off-machine)
#
#  Jalan manual:  bash backup-db.sh
#  Cron harian :  0 18 * * *  $HOME/backup-db.sh >> $HOME/backup.log 2>&1
# ============================================================================
set -euo pipefail

ENV_FILE="${ENV_FILE:-/var/www/akalink/shared/.env}"
OUTDIR="${OUTDIR:-/var/backups/akalink}"
KEEP="${KEEP:-14}"
BUCKET="${BUCKET:-}"   # contoh: gs://akalink-backups (opsional)

mkdir -p "$OUTDIR"

# DATABASE_URL dari .env aplikasi; ubah port pooler 6543 (transaction) -> 5432
# (session) karena pg_dump butuh sesi penuh. sslmode=require untuk Supabase.
DBURL=$(grep -m1 '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
DUMPURL=$(printf '%s' "$DBURL" | sed -E 's|:6543/|:5432/|')
case "$DUMPURL" in
  *\?*) : ;;                        # sudah ada query string
  *)    DUMPURL="${DUMPURL}?sslmode=require" ;;
esac

TS=$(date +%Y%m%d_%H%M%S)
FILE="$OUTDIR/akalink_${TS}.sql.gz"

# Dump (pg_wrapper otomatis memilih pg_dump yang cocok dgn versi server).
pg_dump "$DUMPURL" --no-owner --no-privileges | gzip -9 > "$FILE"
SIZE=$(du -h "$FILE" | cut -f1)
echo "$(date '+%F %T')  backup OK: $FILE ($SIZE)"

# Rotasi lokal: sisakan $KEEP file terbaru.
ls -1t "$OUTDIR"/akalink_*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

# Unggah off-machine (opsional, sangat disarankan untuk keamanan).
if [ -n "$BUCKET" ] && command -v gsutil >/dev/null 2>&1; then
  gsutil -q cp "$FILE" "$BUCKET/" && echo "  uploaded -> $BUCKET/"
fi
