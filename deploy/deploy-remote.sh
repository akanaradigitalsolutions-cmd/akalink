#!/usr/bin/env bash
# Dijalankan DI VM oleh GitHub Actions (via ssh 'bash -s').
# Mengganti kode aplikasi dengan rilis baru lalu me-restart service.
set -euo pipefail

APP=/var/www/akalink
RELEASE="$APP/current"

mkdir -p "$RELEASE"
rm -rf "${RELEASE:?}/"*
tar xzf /tmp/deploy.tar.gz -C "$RELEASE"
rm -f /tmp/deploy.tar.gz

# Restart lewat systemd (env rahasia dibaca dari $APP/shared/.env).
sudo systemctl restart akalink
sleep 2
sudo systemctl --no-pager --lines=0 status akalink | head -n 3
echo "✓ Rilis baru aktif."
