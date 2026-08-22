#!/usr/bin/env bash
# ============================================================================
#  AkaLink — setup VM sekali jalan (Ubuntu 22.04, GCP e2-micro 1 GB).
#  Menyiapkan: swap, Node 20, Nginx, direktori app, service systemd, sudoers.
#  Jalankan DI VM:  bash setup-vm.sh
# ============================================================================
set -euo pipefail

echo "▶ Update sistem…"
sudo apt update && sudo apt -y upgrade

echo "▶ Swap 2 GB (penting untuk RAM 1 GB)…"
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "▶ Node.js 20 + Nginx…"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

echo "▶ Direktori aplikasi…"
sudo mkdir -p /var/www/akalink/current /var/www/akalink/shared
sudo chown -R "$USER:$USER" /var/www/akalink

echo "▶ File .env runtime (isi nilainya nanti!)…"
if [ ! -f /var/www/akalink/shared/.env ]; then
  cat > /var/www/akalink/shared/.env <<'EOF'
NODE_ENV=production
PORT=3000
# --- rahasia server (JANGAN commit) ---
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PLATFORM_ADMIN_EMAILS=
# --- publik (juga di GitHub Secrets untuk build) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# --- pembayaran (opsional) ---
DOKU_ENV=
DOKU_CLIENT_ID=
DOKU_SECRET_KEY=
EOF
  chmod 600 /var/www/akalink/shared/.env
fi

echo "▶ Service systemd (auto-restart + auto-start saat boot)…"
sudo tee /etc/systemd/system/akalink.service >/dev/null <<EOF
[Unit]
Description=AkaLink (Next.js standalone)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/akalink/current
EnvironmentFile=/var/www/akalink/shared/.env
ExecStart=/usr/bin/node apps/web/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable akalink

echo "▶ Izin restart tanpa password (untuk deploy otomatis)…"
echo "$USER ALL=(root) NOPASSWD: /bin/systemctl restart akalink, /bin/systemctl status akalink" \
  | sudo tee /etc/sudoers.d/akalink >/dev/null
sudo chmod 440 /etc/sudoers.d/akalink

echo "▶ Nginx reverse proxy (80 → 3000)…"
sudo tee /etc/nginx/sites-available/akalink >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 15m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/akalink /etc/nginx/sites-enabled/akalink
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "✅ Setup selesai."
echo "   1) Isi rahasia:  nano /var/www/akalink/shared/.env"
echo "   2) Tambahkan SSH key deploy (lihat deploy/README.md)."
echo "   3) Jalankan workflow 'Deploy to GCP VM' di GitHub."
