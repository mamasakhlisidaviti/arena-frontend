# Deployment — Arena.ge Frontend

Production setup for the Angular 22 SSR application. The API is deployed separately; this server proxies `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt` to it, so the browser only ever talks to the public site origin.

## Target architecture

```
Internet ──HTTPS──> Nginx :443 ──> Angular SSR :4000 ──internal──> API :3000 ──> MongoDB
```

Deploy the API first and keep it reachable at `API_INTERNAL_URL`. See the backend repository's `DEPLOYMENT.md`.

## Prerequisites

- Ubuntu 24.04 VPS (2 vCPU / 2 GB RAM minimum; the Angular build needs ~1.5 GB)
- Node.js 22+ (24 LTS recommended)
- `git`, `nginx`, `certbot`
- DNS `A` record for the public domain pointing at the VPS
- Running API on the same host (or reachable over a private network)

```bash
sudo apt update
sudo apt install -y nginx git ufw
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 1. Application user and checkout

```bash
sudo useradd --system --create-home --shell /bin/bash arena
sudo mkdir -p /srv/arena/web
sudo chown -R arena:arena /srv/arena
sudo -u arena git clone https://github.com/mamasakhlisidaviti/arena-frontend.git /srv/arena/web
```

## 2. Runtime environment

The SSR server reads environment variables directly at runtime; there is no `.env` loader. Create `/etc/arena/web.env`:

```bash
sudo mkdir -p /etc/arena
sudo tee /etc/arena/web.env >/dev/null <<'EOF'
PORT=4000
API_INTERNAL_URL=http://127.0.0.1:3000
PUBLIC_ORIGIN=https://arena.ge
ALLOWED_HOSTS=arena.ge,www.arena.ge
NODE_ENV=production
EOF
sudo chmod 600 /etc/arena/web.env
```

| Variable | Meaning |
| --- | --- |
| `PORT` | SSR listen port, `4000` behind Nginx |
| `API_INTERNAL_URL` | Internal API origin used by the SSR proxy and server-side data fetching |
| `PUBLIC_ORIGIN` | Origin emitted in canonical, Open Graph and Twitter URLs during SSR |
| `ALLOWED_HOSTS` | Comma-separated hosts Angular SSR accepts; a missing host causes a 403 |

`PUBLIC_SITE_URL` belongs to the API, not this service; it controls absolute URLs in `sitemap.xml` and `robots.txt`, which the SSR host proxies from the API.

## 3. Build

```bash
cd /srv/arena/web
sudo -u arena npm ci --legacy-peer-deps
sudo -u arena npx tsc -p tsconfig.app.json --noEmit
sudo -u arena npm test -- --watch=false
sudo -u arena npm run build
```

`--legacy-peer-deps` is required: PrimeNG 21 declares older Angular peer ranges while the app runs on Angular 22.

The build produces:

- `dist/client/browser/` — static browser assets
- `dist/client/server/server.mjs` — SSR entry point

If the build is killed for memory, add swap (`fallocate -l 2G /swapfile`, `chmod 600`, `mkswap`, `swapon`) or build in CI and copy `dist/` to the server.

## 4. systemd service

Create `/etc/systemd/system/arena-web.service`:

```ini
[Unit]
Description=Arena.ge Angular SSR
After=network.target arena-api.service
Wants=arena-api.service

[Service]
Type=simple
User=arena
Group=arena
WorkingDirectory=/srv/arena/web
EnvironmentFile=/etc/arena/web.env
ExecStart=/usr/bin/node dist/client/server/server.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now arena-web
sudo systemctl status arena-web --no-pager
curl -sI http://127.0.0.1:4000/ | head -5
```

## 5. Nginx and TLS

Start with an HTTP reverse proxy, then let Certbot add TLS and the redirect:

```bash
sudo tee /etc/nginx/sites-available/arena >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name arena.ge www.arena.ge;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/arena /etc/nginx/sites-enabled/arena
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d arena.ge -d www.arena.ge
```

After HTTPS works, you can add HSTS in the TLS server block:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Keep `client_max_body_size` above the API's `MAX_UPLOAD_MB` (for example 10 MB for a 5 MB limit) so uploads are not rejected by Nginx first. Do not open port 4000 in the firewall; only 80/443 are public.

If you serve both `arena.ge` and `www.arena.ge`, keep both in `ALLOWED_HOSTS` and either redirect one host to the other in Nginx or serve both. The canonical URL always uses `PUBLIC_ORIGIN`.

## 6. Verification

```bash
curl -sI https://arena.ge/ | head -10
curl -s https://arena.ge/ | grep -E 'og:title|twitter:card|rel="canonical"'
curl -s https://arena.ge/sitemap.xml | head -5
curl -s https://arena.ge/robots.txt
curl -s -o /dev/null -w '%{http_code}\n' https://arena.ge/tournaments
```

Then check in a browser:

- [ ] Homepage, tournament list, tournament detail and registration load over HTTPS
- [ ] Language switch (ka/en/ru) and theme switch (light/dark/system) work
- [ ] Login works through the site origin and the session survives a page reload
- [ ] Admin dashboard, tournament wizard, participants, categories, users and settings open for an admin account
- [ ] Image upload persists after a service restart
- [ ] `/api/health` through the site origin returns 200
- [ ] `http://` redirects to `https://`, and `www` behaviour matches your DNS choice

## 7. Update and rollback

```bash
cd /srv/arena/web
sudo -u arena git pull --ff-only
sudo -u arena npm ci --legacy-peer-deps
sudo -u arena npm run build
sudo systemctl restart arena-web
journalctl -u arena-web -n 50 --no-pager
```

The build replaces hashed assets while the old process may still serve them; restart immediately after the build. For zero-downtime releases, build into a versioned directory and switch a symlink before restarting.

Rollback:

```bash
sudo -u arena git log --oneline -5
sudo -u arena git checkout <commit>
sudo -u arena npm ci --legacy-peer-deps && sudo -u arena npm run build
sudo systemctl restart arena-web
sudo -u arena git checkout main
```

`dist/` is gitignored and must be rebuilt on every deploy.

## 8. Managed platform alternative (Render, Railway, Fly.io)

- Build command: `npm ci --legacy-peer-deps && npm run build`
- Start command: `node dist/client/server/server.mjs`
- Set `PORT`, `API_INTERNAL_URL`, `PUBLIC_ORIGIN` and `ALLOWED_HOSTS` (use the platform hostname, for example `arena.onrender.com`)
- Prefer private networking between the web and API services; if the API is only reachable publicly, `API_INTERNAL_URL` can be its HTTPS origin, but the browser still uses the same site origin through this proxy
- Use an always-on instance; sleeping free tiers cause slow first renders and proxy timeouts
- Keep the API's `CLIENT_ORIGINS` equal to this frontend's public origin

## 9. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| 403 from SSR | Request `Host` is missing from `ALLOWED_HOSTS` |
| 502 `PROXY_UNAVAILABLE` | `API_INTERNAL_URL` unreachable or the API service is down |
| Login succeeds but session is lost | Site not served over HTTPS, so the `Secure` refresh cookie is dropped |
| CORS error | API `CLIENT_ORIGINS` does not include the public site origin |
| Canonical/OG URLs point at localhost | `PUBLIC_ORIGIN` is unset or wrong in `/etc/arena/web.env` |
| Sitemap shows localhost URLs | API `PUBLIC_SITE_URL` is unset or wrong |
| Upload rejected with 413 | Nginx `client_max_body_size` is below the file size |
| Admin pages blank after deploy | Stale chunks from a running process during rebuild; restart `arena-web` |
