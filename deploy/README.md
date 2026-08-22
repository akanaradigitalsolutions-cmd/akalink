# Deploy AkaLink ke VM GCP (e2-micro 1 GB) — prebuild via GitHub Actions

GitHub Actions **membangun** aplikasi (runner RAM besar), lalu mengirim hasil
**standalone** (~18 MB) ke VM. VM hanya menjalankan `node server.js` (~150 MB RAM).
VM tidak pernah menjalankan `next build` atau `pnpm install`.

```
push ke main ─▶ Actions: pnpm build (standalone) ─▶ scp bundle ─▶ ssh: extract + systemctl restart
```

## 1) Siapkan VM (sekali)

SSH ke VM (tombol **SSH** di Compute Engine), lalu:

```bash
# ambil skrip setup dari repo (atau salin manual)
curl -fsSL https://raw.githubusercontent.com/akanaradigitalsolutions-cmd/akalink/main/deploy/setup-vm.sh -o setup-vm.sh
bash setup-vm.sh
```

Skrip ini memasang: swap 2 GB, Node 20, Nginx (80→3000), direktori
`/var/www/akalink`, service `akalink.service`, dan file env
`/var/www/akalink/shared/.env`.

## 2) Isi rahasia runtime di VM

```bash
nano /var/www/akalink/shared/.env
```

Isi dari nilai yang sama seperti di Vercel:

- `DATABASE_URL` (Supabase → Database → Transaction pooler, port 6543)
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLATFORM_ADMIN_EMAILS`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DOKU_*` (bila dipakai)

## 3) Kunci SSH untuk deploy (dari GitHub → VM)

Di komputer/Cloud Shell:

```bash
ssh-keygen -t ed25519 -C "gh-deploy" -f gh_deploy -N ""
```

- **Public key** (`gh_deploy.pub`): tambahkan ke VM.
  GCP Console → VM `akalink-vm` → **Edit** → **SSH Keys** → **Add item** →
  tempel isi `gh_deploy.pub`. Catat username di akhir baris (mis. `gh-deploy`
  atau nama Google Anda) — itu jadi `VM_USER`.
- **Private key** (`gh_deploy`): jadi GitHub Secret `VM_SSH_KEY`.

## 4) GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Nilai |
|---|---|
| `VM_HOST` | IP eksternal VM (mis. `136.66.227.188`) |
| `VM_USER` | username SSH di VM (dari langkah 3) |
| `VM_SSH_KEY` | **seluruh isi** private key `gh_deploy` |
| `NEXT_PUBLIC_SUPABASE_URL` | sama seperti di Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sama seperti di Vercel |

> Rahasia runtime (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DOKU_*`)
> **tidak** disimpan di GitHub — hanya di `/var/www/akalink/shared/.env` pada VM.

## 5) Deploy

- Otomatis: setiap push ke `main`.
- Manual: GitHub → **Actions → Deploy to GCP VM → Run workflow**.

Cek: buka `http://<IP-VM>` — aplikasi harus tampil.

## 6) Domain + HTTPS (opsional, setelah jalan)

Arahkan subdomain (mis. `app.namadomain.com`) A-record ke IP VM, lalu:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.namadomain.com
```

Certbot mengurus sertifikat gratis + auto-renew.

## Perintah berguna di VM

```bash
sudo systemctl status akalink      # status app
sudo journalctl -u akalink -f      # log realtime
sudo systemctl restart akalink     # restart manual
free -h                            # cek RAM/swap
```
