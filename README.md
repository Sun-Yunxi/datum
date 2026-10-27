<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="Reglet logo" />
</p>

<h1 align="center">Reglet</h1>

<p align="center">A browser-based generator for print-ready geometric grid paper.</p>

<p align="center"><strong>Version 0.75</strong> · MIT License · React 19 + TypeScript + Vite 8</p>

<p align="center"><a href="https://sun-yunxi.github.io/reglet/"><strong>Live demo →</strong></a></p>

Reglet composes paper settings and element modules into a precise vector PDF. Everything runs locally in your browser — no uploads, no accounts, no server round-trips.

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
  - [1. Prepare the Environment](#1-prepare-the-environment)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Development Deployment](#3-development-deployment)
  - [4. Production Build](#4-production-build)
  - [5. Production Deployment](#5-production-deployment)
    - [5.1 Linux + Nginx](#51-linux--nginx)
    - [5.2 Windows IIS](#52-windows-iis)
    - [5.3 macOS](#53-macos)
    - [5.4 HTTPS and reverse proxy](#54-https-and-reverse-proxy)
    - [5.5 Object storage / CDN](#55-object-storage--cdn)
  - [6. Docker Deployment](#6-docker-deployment)
  - [7. Multi-Device and Multi-Platform](#7-multi-device-and-multi-platform)
  - [8. Production Checklist](#8-production-checklist)
- [Usage](#usage)
- [Language Detection](#language-detection)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [目录](#目录)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [部署方案](#部署方案)
  - [1. 准备环境](#1-准备环境)
  - [2. 安装依赖](#2-安装依赖)
  - [3. 开发部署](#3-开发部署)
  - [4. 生产构建](#4-生产构建)
  - [5. 生产环境部署](#5-生产环境部署)
    - [5.1 Linux + Nginx](#51-linux--nginx-1)
    - [5.2 Windows IIS](#52-windows-iis-1)
    - [5.3 macOS](#53-macos-1)
    - [5.4 HTTPS 与反向代理](#54-https-与反向代理)
    - [5.5 对象存储 / CDN](#55-对象存储--cdn)
  - [6. Docker 部署](#6-docker-部署)
  - [7. 多端与多平台](#7-多端与多平台)
  - [8. 上线检查清单](#8-上线检查清单)
- [使用方式](#使用方式)
- [语言自动切换](#语言自动切换)
- [项目结构](#项目结构)
- [维护文档](#维护文档)
- [许可证](#许可证)
- [致谢](#致谢)

## Features

- **Paper sizes** — A0–A5, B0–B5, Letter, Legal, Junior Legal, Ledger, Tabloid, and custom sizes in millimetres; portrait or landscape.
- **Duplex binding** — independent odd-page and even-page margin sets, rendered as two-page spreads.
- **Nine element modules** — interval lines, diagonal lines, dots, single lines, text (title / page number / single text), rectangles, circles, QR codes, and watermarks.
- **Module cards** — copy, add another of the same type, or remove; modules are stacked in the order they were added. All modules start removed and are added from the top control.
- **12 preset templates** — notebook paper, Cornell notes, grids, manuscript paper, staff paper, monthly planner, and more.
- **Custom fonts** — drag and drop or choose multiple `.woff2`, `.ttf`, or `.otf` files (up to 50 MB each); parsed locally with fontkit and shared across every text module. A batch larger than 25 MB asks for confirmation once per tab, and parsing runs in a cancellable "Parsing fonts" dialog.
- **Safe export** — grid density validation plus a pre-export complexity estimate. Extremely dense output asks for confirmation before it can freeze the main thread.
- **Export progress & cancellation** — every export opens an `mdui` dialog titled "Generating PDF". The download phase is determinate (0–90%) and shows percentage and speed; at 90% it switches to an indeterminate "Generating" state with no percentage. Cancel with the button or Esc; the in-flight download is aborted and discarded. An integrity mismatch is reported inside the dialog instead of an alert.
- **Font caching** — a small service worker caches only the PDF font files (Sarasa UI SC Regular / Bold / Oblique / Bold Italic `.ttf`) in `reglet-fonts-v1`, so later exports skip the download. A font file is fetched only when an export actually needs that face (see below). No JS, CSS, HTML, or other data is persisted.
- **Built-in PDF font** — every Text module defaults to 「更纱黑体」/ Sarasa Gothic (Sarasa UI SC). Each Text module has Bold and Italic switches below the font box; the four combinations map to Regular, Bold, Oblique (synthetic italic obtained by shearing Regular) and Bold Italic. Only the faces used by the current export are downloaded — with all Text modules on custom fonts, nothing is downloaded at all. A custom font is embedded exactly as uploaded, and its Bold/Italic switches are ignored.
- **System UI fonts** — the interface uses the CSS `system-ui` stack, so no web font is downloaded or blocked. The footer notes the system-font policy and the PDF font licence.
- **Bilingual UI** — English and Simplified Chinese, detected automatically from the browser language.
- **Privacy** — fonts, images, and PDF generation never leave your device.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build | Vite 8 (Rolldown) |
| State | Zustand |
| PDF | pdfmake (lazy-loaded) |
| UI components | mdui 2 (Web Components + MD3 design tokens) |
| Font | UI: CSS `system-ui` stack · PDF: Sarasa UI SC Regular / Bold / Oblique / Bold Italic — 更纱黑体 / Sarasa Gothic (SIL OFL 1.1) |
| Font validation / QR | fontkit / qrcode |

## Deployment

Reglet is a **static single-page application**: no backend, no database, no server-side rendering. Every deployment therefore reduces to the same two steps — build `dist/` with Node.js, then serve that folder over HTTP(S) from any static host. `npm run dev` and `npm run preview` exist for development and verification only; neither is a production server.

### 1. Prepare the Environment

| Tool | Requirement | Verify |
| --- | --- | --- |
| Node.js | 22 LTS, **22.23.4+** (patched for CVE-2026-111497) | `node -v` |
| npm | 10+ (ships with Node.js) | `npm -v` |
| Git | Any recent version (optional if you download a ZIP) | `git --version` |
| Docker | Engine 24+ or Docker Desktop, with the Buildx plugin | `docker version`, `docker buildx version` |

<details>
<summary>Windows 10 / 11</summary>

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
node -v
npm -v
```

Alternatively install the official MSI from nodejs.org, or use `fnm` / `nvm-windows`. If `node` or `npm` is not recognised after installation, open a new terminal so the updated `PATH` is picked up.
</details>

<details>
<summary>macOS</summary>

```bash
brew install node@22 git
# node@22 is keg-only; expose it on PATH
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc   # Apple Silicon
# echo 'export PATH="/usr/local/opt/node@22/bin:$PATH"' >> ~/.zshrc    # Intel
source ~/.zshrc
node -v && npm -v
```
</details>

<details>
<summary>Linux (Debian / Ubuntu / RHEL / Arch)</summary>

```bash
# Debian / Ubuntu — NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git

# RHEL / Fedora / Rocky
sudo dnf module install -y nodejs:22
sudo dnf install -y git

# Arch Linux / Manjaro
sudo pacman -S --needed nodejs npm git
```

Arch's `nodejs` package tracks the current release and already satisfies the ≥22 requirement, so no NodeSource repository is involved.

`nvm` works equally well on any distribution:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22 && nvm use 22
```
</details>

<details>
<summary>Docker</summary>

Install Docker Desktop (Windows / macOS) or Docker Engine (Linux). Confirm that Buildx is available, since the multi-architecture build below depends on it:

```bash
docker version
docker buildx version
```

On Linux, add your user to the `docker` group so that `docker` runs without `sudo`, then log out and back in:

```bash
sudo usermod -aG docker "$USER"
```
</details>

### 2. Install Dependencies

```bash
git clone https://github.com/Sun-Yunxi/reglet.git Reglet
cd Reglet
npm ci
```

`npm ci` installs the exact dependency tree recorded in `package-lock.json`, never modifies the lockfile, and fails loudly if `package.json` and the lockfile disagree — which is what you want on a build machine. Use `npm install` only when you intentionally upgrade a dependency.

- If `npm ci` reports an out-of-sync lockfile, run `npm install` once, commit the updated `package-lock.json`, and return to `npm ci`.
- Behind a slow or restricted network, a mirror can be configured once: `npm config set registry https://registry.npmmirror.com`.
- `node_modules/` is build input only; it must never be uploaded to a static host.

### 3. Development Deployment

```bash
npm run dev        # Vite dev server
```

The server binds to all interfaces (`host: true`) on port **5174**, and automatically picks the next free port if 5174 is taken — read the printed URL rather than assuming the port. Typical output:

```text
➜  Local:   http://localhost:5174/
➜  Network: http://192.168.0.10:5174/
```

- **Desktop local access** — `http://localhost:5174/`.
- **LAN access from phones and tablets** — use the printed `Network` address. Find the host IP with `ipconfig` (Windows), `ipconfig getifaddr en0` (macOS), or `hostname -I` (Linux).
- **Firewall** — allow inbound TCP 5174 if other devices cannot connect: `New-NetFirewallRule -DisplayName "Reglet dev" -Direction Inbound -Protocol TCP -LocalPort 5174 -Action Allow` (Windows, elevated PowerShell) or `sudo ufw allow 5174/tcp` (Ubuntu).
- **Force a language** — append `?lang=en` or `?lang=zh-hans` to any URL, in development or production.
- **Never expose the dev server to the public internet.** It has no TLS, no access control, and serves unminified source through Vite's module graph.

Other useful scripts during development:

```bash
npm run lint       # oxlint
npm run preview    # serve an existing production build on port 4173
```

### 4. Production Build

```bash
npm ci
npm run build      # tsc -b && vite build
```

`npm run build` type-checks the whole project first; any TypeScript error aborts the build before Vite runs. The output is a fully static `dist/` folder:

```text
dist/
├─ index.html                    # entry document (no external requests except hashed assets)
├─ favicon.svg
├─ LICENSE-Sarasa.txt            # SIL OFL 1.1 licence for the PDF font, emitted by the legalNotices plugin
├─ THIRD-PARTY-NOTICES.txt       # licence texts of all runtime dependencies, auto-collected
├─ sw.js                         # font-only service worker (copied verbatim from public/)
└─ assets/
   ├─ index-<hash>.js            # application code
   ├─ index-<hash>.css
   ├─ generator-<hash>.js        # pdfmake document builder, lazy-loaded on export
   ├─ vendor-react-<hash>.js     # long-lived vendor chunk
   ├─ vendor-mdui-<hash>.js
   ├─ vendor-mdui-<hash>.css
   ├─ browser-module-<hash>.js   # fontkit / qrcode, lazy-loaded
   ├─ rolldown-runtime-<hash>.js
   ├─ SarasaUiSC-Regular-<hash>.ttf     # ≈12.5 MB, PDF-only
   ├─ SarasaUiSC-Bold-<hash>.ttf        # ≈12.3 MB, PDF-only
   ├─ SarasaUiSC-Oblique-<hash>.ttf     # ≈13.2 MB, PDF-only (synthetic italic)
   └─ SarasaUiSC-BoldItalic-<hash>.ttf  # ≈13.1 MB, PDF-only
```

The whole folder is roughly **53 MB**, almost all of which is the four Sarasa UI SC TTF files (13,104,928 / 12,903,080 / 13,848,284 / 13,684,108 bytes). They are lazy assets: an export downloads only the faces it needs, so a typical first export transfers 13 MB, not 53 MB. The SIL Open Font License permits subsetting and modification, but the project deliberately ships the fonts whole and does not subset them. Hashed file names make every asset safe to cache forever; only `index.html` changes between releases.

**Verify the build locally before uploading it anywhere:**

```bash
npm run preview    # http://localhost:4173/
```

Open the site, switch language, export a PDF, and confirm that `dist/` contains both `.txt` licence files. `THIRD-PARTY-NOTICES.txt` is written by the plugin's `closeBundle` hook, so a build log that ends normally always leaves it in place.

On `localhost` (and any HTTPS deployment) the service worker registers and caches only the PDF font files (`.woff2`, `.ttf`, or `.otf`; currently the Sarasa TTFs). In DevTools → Application → Cache Storage you should see exactly one cache, `reglet-fonts-v1`, after the first export — it holds only the faces that export used. JS, CSS and HTML must not appear in it.

**Sub-path hosting.** If the site will live under a prefix such as `https://example.com/reglet/`, build with a matching base so that asset URLs resolve:

```bash
npm run build -- --base=/reglet/
```

Then serve `dist/` at that prefix (Nginx `location /reglet/`, object-storage key prefix, IIS virtual directory). With Docker, pass the same flag as a build argument (`docker build --build-arg ...` requires adding the argument to the Dockerfile, or build the base-prefixed `dist/` on the host and copy it into a plain `nginx:alpine` image).

**In CI**, the build is two commands plus an artifact upload: `npm ci`, `npm run build`, then archive `dist/`. Cache `~/.npm` between runs; the Sarasa fonts are already committed, so a build needs no secrets and no network access beyond the npm registry.

### 5. Production Deployment

Any static host works. The recipes below all assume `dist/` has been copied to the server and that the host serves `index.html` for unknown paths (the app has no client-side router today, so this rule is only a safety net for future routes).

#### 5.1 Linux + Nginx

```bash
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/reglet
sudo cp -r dist/. /var/www/reglet/
sudo chown -R www-data:www-data /var/www/reglet
```

On **Arch Linux / Manjaro** the same steps use pacman, and Nginx runs as the `http` user:

```bash
sudo pacman -S --needed nginx
sudo mkdir -p /var/www/reglet
sudo cp -r dist/. /var/www/reglet/
sudo chown -R http:http /var/www/reglet
sudo systemctl enable --now nginx
```

Arch's packaged `nginx.conf` differs from Debian's: confirm whether it includes `/etc/nginx/conf.d/*.conf`; if it does not, place the `server` block directly inside the `http { … }` block of `/etc/nginx/nginx.conf`.

Create `/etc/nginx/conf.d/reglet.conf`:

```nginx
server {
    listen 80;
    server_name reglet.example.com;          # or _ for any host

    root /var/www/reglet;
    index index.html;

    # SPA fallback: unknown paths render the app instead of 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Hashed assets are immutable — cache for a year
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # The entry document, the licence files and the service worker must be revalidated.
    # A long-cached sw.js would keep clients on a stale worker version.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location = /sw.js {
        add_header Cache-Control "no-cache";
    }

    location ~* \.(txt|svg)$ {
        add_header Cache-Control "public, max-age=86400";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;

    add_header X-Content-Type-Options "nosniff" always;
}
```

Reload and verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/assets/SarasaUiSC-Regular-*.ttf
```

The second command must return `Content-Type: font/ttf`. Modern nginx already maps TTF in `/etc/nginx/mime.types`; if yours does not, add `font/ttf ttf;` to the existing `types { … }` block in that file rather than declaring a new `types` block (a standalone block replaces the inherited MIME map and would break CSS and JS).

On RHEL / CentOS, label the directory for SELinux: `sudo chcon -Rt httpd_sys_content_t /var/www/reglet`.

#### 5.2 Windows IIS

Enable **IIS** plus **Static Content**, then install the **URL Rewrite** module (required for the fallback rule). Copy `dist/` to `C:\sites\reglet` and add `C:\sites\reglet\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".ttf" />
      <mimeMap fileExtension=".ttf" mimeType="font/ttf" />
    </staticContent>
    <rewrite>
      <rules>
        <rule name="Reglet SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

Create the site (elevated PowerShell, Windows Server):

```powershell
New-Website -Name "Reglet" -PhysicalPath "C:\sites\reglet" -Port 8080
New-NetFirewallRule -DisplayName "Reglet" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

On Windows 10/11, `New-Website` is unavailable; use the IIS Manager GUI or run Nginx for Windows with the Linux configuration above.

#### 5.3 macOS

```bash
brew install nginx
# Apple Silicon: /opt/homebrew/etc/nginx/nginx.conf
# Intel:         /usr/local/etc/nginx/nginx.conf
```

Point `root` at the absolute path of `dist/` (for example `/Users/me/sites/reglet`) and reuse the `server` block from 5.1, then:

```bash
sudo nginx -t
brew services start nginx        # survives logout; use `nginx` for a one-off run
```

For a quick throwaway check instead of a full install:

```bash
caddy file-server --root dist --listen :8080
```

#### 5.4 HTTPS and reverse proxy

HTTPS is required for a public deployment: it protects nothing secret (all generation is local) but keeps the site out of browser "not secure" warnings and enables modern browser features.

**Caddy** obtains and renews certificates automatically. Serve `dist/` directly:

```caddyfile
reglet.example.com {
    root * /var/www/reglet
    try_files {path} /index.html
    file_server
    encode gzip zstd
}
```

…or front an existing container or Nginx instance:

```caddyfile
reglet.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

**Nginx with an existing certificate** (for example from certbot at `/etc/letsencrypt/live/reglet.example.com/`):

```nginx
server {
    listen 80;
    server_name reglet.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name reglet.example.com;
    ssl_certificate     /etc/letsencrypt/live/reglet.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reglet.example.com/privkey.pem;

    root /var/www/reglet;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    location = /index.html { add_header Cache-Control "no-cache"; }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;
}
```

#### 5.5 Object storage / CDN

Upload the **contents** of `dist/` to the bucket root (not the `dist` folder itself), set the index document to `index.html`, and configure:

- MIME type `font/ttf` for `*.ttf` (`font/woff2` for `*.woff2`, `font/otf` for `*.otf` if you swap the font) — many providers default to `application/octet-stream`, which blocks font loading.
- `Cache-Control: public, max-age=31536000, immutable` for `assets/*`.
- `Cache-Control: no-cache` (or a short TTL) for `index.html`, `sw.js`, `LICENSE-Sarasa.txt`, and `THIRD-PARTY-NOTICES.txt`.
- 404 responses mapped to `/index.html` if you later add client-side routes.
- Gzip or Brotli compression for `text/*`, `application/javascript`, `application/json`, and `image/svg+xml`.

### 6. Docker Deployment

The repository ships a multi-stage `Dockerfile`. Node.js is used only during the build; the final image contains Nginx and the static files, nothing else.

```dockerfile
# Build stage — pinned to the release patched for CVE-2026-111497
FROM node:22.23.4-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: only the static output
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`.dockerignore` is part of the deployment contract. It keeps host `node_modules/` (Windows binaries) out of the build context, so the container always reinstalls Linux dependencies with `npm ci`, and it keeps `dist/`, `.git`, and editor folders out of the context for a faster, smaller build.

**Build and run:**

```bash
docker build -t reglet:0.75 .
docker run -d --name reglet --restart unless-stopped -p 8080:80 reglet:0.75
```

**Verify and operate:**

```bash
docker ps                              # container is Up, port 8080->80
curl -I http://localhost:8080/          # 200 OK, text/html
curl -I http://localhost:8080/assets/SarasaUiSC-Regular-*.ttf   # font/ttf
docker logs -f reglet                    # access log / errors
docker exec reglet ls /usr/share/nginx/html   # index.html + both licence files
```

Open `http://localhost:8080/` from the host, and `http://<host-ip>:8080/` from any phone on the same network. The image is self-contained: `LICENSE-Sarasa.txt` and `THIRD-PARTY-NOTICES.txt` are inside `dist/` and travel with it, which satisfies the OFL requirement to keep the licence alongside copies of the font.

**Docker Compose** — save as `compose.yaml` next to the Dockerfile:

```yaml
services:
  reglet:
    build: .
    image: reglet:0.75
    container_name: reglet
    restart: unless-stopped
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/"]
      interval: 30s
      timeout: 3s
      retries: 3
```

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
docker compose down
```

**Multi-architecture images** — Intel/AMD servers and ARM hosts (Apple Silicon, AWS Graviton, Raspberry Pi) need different images. `nginx:alpine` and `node:22.23.4-alpine` both publish multi-arch manifests, so one command produces both:

```bash
docker buildx create --name reglet-builder --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t <registry>/reglet:0.75 --push .
```

Without a registry, build for the target host's architecture only (`--platform linux/arm64` on ARM), or export the image as a file and load it on the target machine:

```bash
docker save reglet:0.75 | gzip > reglet-0.75.tar.gz
# copy the archive, then on the target:
gunzip -c reglet-0.75.tar.gz | docker load
```

**Custom Nginx configuration.** To change caching, add security headers, or host under a sub-path, mount a config file instead of rebuilding:

```bash
docker run -d --name reglet -p 8080:80 --restart unless-stopped \
  -v /etc/reglet/default.conf:/etc/nginx/conf.d/default.conf:ro \
  reglet:0.75
```

The mounted file must itself contain the `try_files` fallback and the `assets` cache rules, because it replaces the image's default `default.conf`.

**Updating a running deployment:**

```bash
git pull
docker compose up -d --build     # rebuild, then recreate the container
# or, without Compose:
docker build -t reglet:0.75 . && docker rm -f reglet && \
  docker run -d --name reglet --restart unless-stopped -p 8080:80 reglet:0.75
```

Hashed asset names mean the old and new versions never collide; `index.html` is revalidated on every load, so clients pick up a new release immediately.

### 7. Multi-Device and Multi-Platform

Because rendering and PDF generation happen entirely in the browser, the deployment only needs to deliver static files. The support matrix:

| Platform | Browsers | Notes |
| --- | --- | --- |
| Windows / Linux | Chrome, Edge, Firefox, Chromium ≥ 110 | Full support |
| macOS | Safari 16.4+, Chrome, Firefox, Edge | Full support |
| iPhone / iPad | Safari 16.4+, Chrome for iOS | Layout switches below 900 px |
| Android phone / tablet | Chrome 110+, Samsung Internet, Firefox | Layout switches below 900 px |
| Any modern TV / desktop browser | Chromium-based | Works; input is pointer-driven |

- **Layout** — a `max-width: 900px` breakpoint reflows panels into single-column layouts; `main.tsx` also adds a `.mobile` class based on the user agent. Desktop layout is unchanged above the breakpoint.
- **PDF export is client-side** — the phone or laptop builds the PDF itself, so server CPU and memory requirements stay flat regardless of traffic. Very dense grids ask for confirmation before exporting; see "Safe export" above.
- **Pop-up blocking** — the generated PDF opens in a new tab. On iOS Safari and stricter mobile browsers, allow pop-ups for the site if the export appears to do nothing.
- **First-load weight** — the four Sarasa UI SC TTFs total ~53 MB in `dist/`, but none of them is fetched on first load: each is requested only when an export actually uses that face (at least one Text module on the built-in font with that Bold/Italic combination), and then cached per the `assets/` rules; the app stays usable while the font loads. The font-only service worker additionally keeps downloaded faces in Cache Storage, so a later export does not re-download them. A first export with plain built-in text transfers about 13 MB.
- **Local network access** — the same build can be served over LAN for testing phones and tablets against a real device; no app install or store submission is involved. Note that the service worker requires a secure context, so it only registers on HTTPS or `localhost` — on a plain-HTTP LAN address it is skipped and the app still works.
- **Offline use** — this project does **not** cache the app shell or HTML/JS/CSS. After the first load the browser's normal HTTP cache covers repeat navigation (GitHub Pages sends `max-age=600`), and the service worker keeps only the fonts, so exports remain fast. It is not a full offline app and deliberately stores no other data.

### 8. Production Checklist

- [ ] Node.js 22 LTS (22.23.4+) and `npm ci` succeed on a clean checkout.
- [ ] `npm run build` completes; `dist/` is ~53 MB and contains `index.html`, `sw.js`, `assets/`, `LICENSE-Sarasa.txt`, `THIRD-PARTY-NOTICES.txt`.
- [ ] `dist/` is served as static files — no Vite dev server, no `npm run preview` in production.
- [ ] `Content-Type: font/ttf` for the Sarasa font files; asset requests return 200, not 404.
- [ ] `assets/*` returns `Cache-Control: public, max-age=31536000, immutable`; `index.html` is revalidated.
- [ ] `sw.js` is served from the site root (respecting the base prefix) with `Content-Type: application/javascript` and `Cache-Control: no-cache`.
- [ ] DevTools → Application shows the service worker `activated`, and Cache Storage contains **only** `reglet-fonts-v1` with the Sarasa TTFs that have been exported.
- [ ] Gzip/Brotli enabled for JS, CSS, JSON, SVG.
- [ ] HTTPS enabled with a valid certificate; HTTP redirects to HTTPS.
- [ ] `X-Content-Type-Options: nosniff` (and HSTS if you control the whole domain).
- [ ] The site loads on a desktop browser, an iPhone, and an Android device; PDF export opens and prints.
- [ ] Language auto-detection works (`zh-*` → Simplified Chinese, otherwise English); `?lang=` overrides it.
- [ ] Footer shows the correct version (0.75).
- [ ] Docker: `docker ps` shows the container healthy, restart policy is `unless-stopped`, and the image includes both licence files.
- [ ] Arm and x86 images exist if the deployment targets mixed hardware.

## Usage

1. Choose a preset template, or start from an empty canvas.
2. Set the paper size, orientation, copies, duplex binding, and margins.
3. Add modules from the "Add Module" control at the top of the sidebar.
4. Adjust each module's colour, offsets, range, spacing, and type-specific options.
5. Click **Download PDF**. The document opens in a new tab, ready to print.

## Language Detection

The interface follows your browser's language preference, which is the source of the HTTP `Accept-Language` header:

- Chinese and its regional variants (`zh`, `zh-CN`, `zh-TW`, `zh-Hant`, …) → **Simplified Chinese**
- Anything else → **English**

Override with a query parameter: `?lang=en` or `?lang=zh-hans`.

## Project Structure

```text
Reglet/
├─ public/
│  ├─ favicon.svg
│  └─ sw.js                # Font-only service worker
├─ src/
│  ├─ components/          # App-level and reusable UI components
│  ├─ components/elements/ # Parameter panels for the nine module types
│  ├─ fonts/               # Font validation and parsing
│  ├─ i18n/                # Translation context and locale JSON
│  ├─ Sarasa/              # PDF fonts (Sarasa UI SC Regular / Bold / Oblique / Bold Italic) + SIL OFL licence
│  ├─ pdf/                 # pdfmake builder, lazy loader, font + estimate helpers
│  ├─ pwa/                 # Service-worker registration and export progress tracking
│  ├─ store/               # Zustand store
│  ├─ templates/           # Preset template definitions
│  ├─ types/               # Shared TypeScript types
│  ├─ utils/               # Toast and dialog helpers
│  ├─ App.tsx
│  ├─ App.css
│  └─ main.tsx
├─ Dockerfile              # Multi-stage build → nginx:alpine
├─ .dockerignore           # Keeps node_modules/ and dist/ out of the build context
├─ LICENSE                 # MIT licence for Reglet itself
├─ MAINTAINER-GUIDE.md     # Bilingual maintainer documentation
├─ CHANGELOG.md            # Version history
├─ README.md
└─ vite.config.ts
```

## Documentation

[MAINTAINER-GUIDE.md](MAINTAINER-GUIDE.md) documents the architecture, CSS tokens, animation system, dependency inventory, and component relationships in English and Chinese. [CHANGELOG.md](CHANGELOG.md) records the version history.

## License

- **Reglet** is released under the [MIT License](LICENSE).
- **Sarasa UI SC** provides the four bundled PDF faces — Regular (13,104,928 bytes), Bold (12,903,080), Oblique (13,848,284) and Bold Italic (13,684,108) — and is distributed under the **SIL Open Font License 1.1**. `SarasaUiSC-Oblique.ttf` is a derivative generated from the Regular outlines (sheared 9.4°, matching the Bold Italic italic angle) because Sarasa UI SC has no separate Regular Italic; it keeps the family name, which the OFL does not reserve. The OFL permits subsetting and modification, but the project ships every face whole and does not subset it. The full licence ships as [`src/Sarasa/LICENSE-Sarasa.txt`](src/Sarasa/LICENSE-Sarasa.txt) and is emitted to `dist/LICENSE-Sarasa.txt` at build time.
- The interface itself uses the CSS `system-ui` font stack, so no web font is bundled for the UI.
- Third-party dependency licences are generated into `dist/THIRD-PARTY-NOTICES.txt` at build time.

## Acknowledgements

Thanks to the React, Vite, Zustand, pdfmake, mdui, fontkit, and qrcode projects, and to the Sarasa Gothic project for the Sarasa UI SC typeface.

---

<p align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="Reglet 标志" />
</p>

<h1 align="center">Reglet</h1>

<p align="center">基于浏览器的印刷级图形方格纸生成工具。</p>

<p align="center">版本 0.75 · MIT 许可证 · React 19 + TypeScript + Vite 8</p>

<p align="center"><a href="https://sun-yunxi.github.io/reglet/"><strong>在线使用 →</strong></a></p>

Reglet 将纸张设定与图形模块组合成精确的矢量 PDF。全部处理都在浏览器本地完成——不上传文件、无需账号、不经服务器周转。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [部署方案](#部署方案)
  - [1. 准备环境](#1-准备环境)
  - [2. 安装依赖](#2-安装依赖)
  - [3. 开发部署](#3-开发部署)
  - [4. 生产构建](#4-生产构建)
  - [5. 生产环境部署](#5-生产环境部署)
  - [6. Docker 部署](#6-docker-部署)
  - [7. 多端与多平台](#7-多端与多平台)
  - [8. 上线检查清单](#8-上线检查清单)
- [使用方式](#使用方式)
- [语言自动切换](#语言自动切换)
- [项目结构](#项目结构)
- [维护文档](#维护文档)
- [许可证](#许可证)
- [致谢](#致谢)

## 功能特性

- **纸张尺寸**——A0–A5、B0–B5、Letter、Legal、Junior Legal、Ledger、Tabloid，以及以毫米为单位的自定义尺寸；支持直向与横向。
- **双面装订**——奇数页与偶数页各有一套独立留白，按两页展开排版。
- **九类图形模块**——间隔线、斜线、网点、单线条、文字（标题 / 页码 / 单文字）、矩形、圆形、二维码、水印。
- **模块卡片**——可复制、添加同类、移除；模块按添加顺序平铺排列。默认不包含任何模块，需从顶部控件逐个添加。
- **12 套预设模板**——笔记纸、康奈尔笔记、方格纸、网格纸、漫画稿纸、五线谱、月计划表等。
- **自定义字体**——支持拖拽或选择多个 `.woff2`、`.ttf`、`.otf` 文件（单文件不超过 50MB），在浏览器端用 fontkit 解析；任意模块上传一次后，所有文字模块均可共用。单批总量超过 25MB 时每个标签页只提示一次，解析过程显示可取消的「字体解析中」对话框。
- **安全导出**——网格密度校验 + 导出前复杂度预估。极端密集的输出会先请求确认，避免主线程假死。
- **导出进度与取消**——每次导出都会弹出标题为「PDF生成中」的 `mdui` 对话框：下载阶段为确定进度（0–90%），显示百分比与速度；达到 90% 后切换为不确定进度的「生成中」，不再显示百分比。可用按钮或 Esc 取消，进行中的下载会被中止并丢弃。下载内容与服务器不一致时，提示改为对话框内文字，不再弹出 alert。
- **字体缓存**——一个小型 Service Worker 只把 PDF 字体文件（Sarasa UI SC 常规 / 加粗 / 斜体 / 加粗斜体 `.ttf`）缓存到 `reglet-fonts-v1`，后续导出无需重复下载；每种字形仅在导出确实用到时才会下载，不缓存 JS/CSS/HTML，也不持久化其他任何数据。
- **内置 PDF 字体**——所有文字模块默认使用「更纱黑体」/ Sarasa Gothic（Sarasa UI SC）。每个文字模块在字体框下方都有「加粗」「斜体」两个开关，四种组合分别对应常规、加粗、斜体（由常规字形斜切得到的合成斜体）、加粗斜体；每次导出只下载实际用到的字形，若所有文字模块都使用自定义字体则完全不下载。自定义字体按上传文件原样嵌入，两个开关对它不生效。
- **界面系统字体**——界面使用 CSS `system-ui` 字体栈，不下载任何 Web 字体、不阻塞首屏；页脚说明系统字体策略与 PDF 字体许可。
- **中英双语**——根据浏览器语言自动选择界面语言。
- **隐私友好**——字体、图片与 PDF 生成全程不离开本机。

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8（Rolldown） |
| 状态 | Zustand |
| PDF | pdfmake（按需加载） |
| UI 组件 | mdui 2（Web Components + MD3 设计令牌） |
| 字体 | 界面：CSS `system-ui` 字体栈 · PDF：Sarasa UI SC 常规 / 加粗 / 斜体 / 加粗斜体 —— 更纱黑体 / Sarasa Gothic（SIL OFL 1.1） |
| 字体校验 / 二维码 | fontkit / qrcode |

## 部署方案

Reglet 是**纯静态单页应用**：没有后端、没有数据库、不做服务端渲染。因此任何部署都归结为同样的两步——用 Node.js 构建出 `dist/`，再把这一个目录交给任意静态服务器托管。`npm run dev` 与 `npm run preview` 只用于开发与验收，两者都不是生产服务器。

### 1. 准备环境

| 工具 | 版本要求 | 验证命令 |
| --- | --- | --- |
| Node.js | 22 LTS，**22.23.4+**（已修复 CVE-2026-111497） | `node -v` |
| npm | 10+（随 Node.js 提供） | `npm -v` |
| Git | 任意较新版本（直接下载 ZIP 则可不装） | `git --version` |
| Docker | Engine 24+ 或 Docker Desktop，并带 Buildx 插件 | `docker version`、`docker buildx version` |

<details>
<summary>Windows 10 / 11</summary>

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
node -v
npm -v
```

也可以从 nodejs.org 下载官方 MSI，或使用 `fnm` / `nvm-windows`。安装后若提示找不到 `node` / `npm`，请新开一个终端，让更新后的 `PATH` 生效。
</details>

<details>
<summary>macOS</summary>

```bash
brew install node@22 git
# node@22 是 keg-only，需要手动加入 PATH
echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc   # Apple Silicon
# echo 'export PATH="/usr/local/opt/node@22/bin:$PATH"' >> ~/.zshrc    # Intel
source ~/.zshrc
node -v && npm -v
```
</details>

<details>
<summary>Linux（Debian / Ubuntu / RHEL / Arch）</summary>

```bash
# Debian / Ubuntu —— NodeSource 软件源
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git

# RHEL / Fedora / Rocky
sudo dnf module install -y nodejs:22
sudo dnf install -y git

# Arch Linux / Manjaro
sudo pacman -S --needed nodejs npm git
```

Arch 的 `nodejs` 包跟随当前版本，已满足 ≥22 的要求，无需添加 NodeSource 软件源。

任何发行版也可以用 `nvm`：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22 && nvm use 22
```
</details>

<details>
<summary>Docker</summary>

Windows / macOS 安装 Docker Desktop，Linux 安装 Docker Engine。下面的多架构构建依赖 Buildx，请先确认可用：

```bash
docker version
docker buildx version
```

Linux 上把当前用户加入 `docker` 组即可免 `sudo`，加完需重新登录：

```bash
sudo usermod -aG docker "$USER"
```
</details>

### 2. 安装依赖

```bash
git clone https://github.com/Sun-Yunxi/reglet.git Reglet
cd Reglet
npm ci
```

`npm ci` 严格按 `package-lock.json` 安装，不会改写锁文件；当 `package.json` 与锁文件不一致时会直接报错——这正是构建机需要的行为。只有在主动升级依赖时才用 `npm install`。

- 若 `npm ci` 报锁文件不同步，先执行一次 `npm install`，提交更新后的 `package-lock.json`，再回到 `npm ci`。
- 网络较慢或受限时，可一次性配置镜像：`npm config set registry https://registry.npmmirror.com`。
- `node_modules/` 只是构建输入，**绝不能**上传到静态服务器。

### 3. 开发部署

```bash
npm run dev        # Vite 开发服务器
```

服务器监听所有网卡（`host: true`），端口 **5174**；若该端口被占用会自动顺延，请以终端实际打印的地址为准：

```text
➜  Local:   http://localhost:5174/
➜  Network: http://192.168.0.10:5174/
```

- **桌面本机访问**——`http://localhost:5174/`。
- **手机 / 平板局域网访问**——使用打印出的 `Network` 地址。查本机 IP：Windows `ipconfig`、macOS `ipconfig getifaddr en0`、Linux `hostname -I`。
- **防火墙**——其他设备连不上时放行入站 TCP 5174：Windows（管理员 PowerShell）`New-NetFirewallRule -DisplayName "Reglet dev" -Direction Inbound -Protocol TCP -LocalPort 5174 -Action Allow`；Ubuntu 执行 `sudo ufw allow 5174/tcp`。
- **强制语言**——在任意 URL 后加 `?lang=en` 或 `?lang=zh-hans`，开发与生产环境都适用。
- **切勿把开发服务器暴露到公网**：它没有 TLS、没有访问控制，并通过 Vite 模块图直接提供未压缩的源码。

开发期另外两个脚本：

```bash
npm run lint       # oxlint
npm run preview    # 在 4173 端口预览已有的生产构建
```

### 4. 生产构建

```bash
npm ci
npm run build      # tsc -b && vite build
```

`npm run build` 会先对整个项目做类型检查，任何 TypeScript 错误都会在 Vite 启动前中止构建。产物是一个完全静态的 `dist/`：

```text
dist/
├─ index.html                     # 入口文档（除带哈希的资源外无外部请求）
├─ favicon.svg
├─ LICENSE-Sarasa.txt             # PDF 字体的 SIL OFL 1.1 协议，由 legalNotices 插件输出
├─ THIRD-PARTY-NOTICES.txt        # 全部运行时依赖的许可证全文，构建时自动收集
├─ sw.js                          # 仅缓存字体的 Service Worker（由 public/ 原样复制）
└─ assets/
   ├─ index-<hash>.js             # 应用代码
   ├─ index-<hash>.css
   ├─ generator-<hash>.js         # pdfmake 文档构建器，导出时按需加载
   ├─ vendor-react-<hash>.js      # 可长期缓存的第三方 chunk
   ├─ vendor-mdui-<hash>.js
   ├─ vendor-mdui-<hash>.css
   ├─ browser-module-<hash>.js    # fontkit / qrcode，按需加载
   ├─ rolldown-runtime-<hash>.js
   ├─ SarasaUiSC-Regular-<hash>.ttf     # 约 12.5 MB，仅用于 PDF
   ├─ SarasaUiSC-Bold-<hash>.ttf        # 约 12.3 MB，仅用于 PDF
   ├─ SarasaUiSC-Oblique-<hash>.ttf     # 约 13.2 MB，仅用于 PDF（合成斜体）
   └─ SarasaUiSC-BoldItalic-<hash>.ttf  # 约 13.1 MB，仅用于 PDF
```

整个目录约 **53 MB**，几乎全部是这四个 Sarasa UI SC TTF（13,104,928 / 12,903,080 / 13,848,284 / 13,684,108 字节）。它们是按需资源：一次导出只下载实际用到的字形，因此首次导出通常只传输约 13 MB 而非 53 MB。SIL OFL 允许子集化与修改，但项目刻意整份打包、不做子集化。文件名带哈希，可以永久缓存；每次发版只有 `index.html` 会变化。

**上传前先在本地验收：**

```bash
npm run preview    # http://localhost:4173/
```

打开页面，切换语言、导出一份 PDF，并确认 `dist/` 中存在两份 `.txt` 许可文件。`THIRD-PARTY-NOTICES.txt` 由插件的 `closeBundle` 钩子写入，只要构建正常结束就一定存在。

在 `localhost`（以及任何 HTTPS 部署）下 Service Worker 会注册并只缓存 PDF 字体文件（`.woff2`、`.ttf`、`.otf`，当前是 Sarasa TTF）。首次导出后按 F12 → Application → Cache Storage，应当只看到一个缓存 `reglet-fonts-v1`，且只含该次导出用到的字形；JS、CSS、HTML 都不应出现在其中。

**子路径托管。** 若站点计划部署在 `https://example.com/reglet/` 这样的前缀下，构建时必须匹配 base，否则资源 URL 会 404：

```bash
npm run build -- --base=/reglet/
```

随后把 `dist/` 部署到对应前缀（Nginx 的 `location /reglet/`、对象存储的键前缀、IIS 虚拟目录）。使用 Docker 时，要么给 Dockerfile 增加构建参数 `--build-arg`，要么在宿主机构建好带 base 的 `dist/` 再复制进一个普通的 `nginx:alpine` 镜像。

**在 CI 中**，构建就是两条命令加一次产物归档：`npm ci`、`npm run build`，然后保存 `dist/`。建议缓存 `~/.npm`；Sarasa 字体已随仓库提交，因此构建不需要任何密钥，也只需要访问 npm 源。

### 5. 生产环境部署

任意静态托管均可。以下方案都假定 `dist/` 已复制到服务器，且未知路径会回落到 `index.html`（当前应用没有前端路由，这条规则只是为将来可能新增的路由兜底）。

#### 5.1 Linux + Nginx

```bash
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/reglet
sudo cp -r dist/. /var/www/reglet/
sudo chown -R www-data:www-data /var/www/reglet
```

**Arch Linux / Manjaro** 用 pacman 完成同样的步骤，Nginx 以 `http` 用户运行：

```bash
sudo pacman -S --needed nginx
sudo mkdir -p /var/www/reglet
sudo cp -r dist/. /var/www/reglet/
sudo chown -R http:http /var/www/reglet
sudo systemctl enable --now nginx
```

Arch 打包的 `nginx.conf` 与 Debian 不同：请先确认其中是否包含 `/etc/nginx/conf.d/*.conf`，若没有，请把下面的 `server` 块直接写进 `/etc/nginx/nginx.conf` 的 `http { … }` 内。

创建 `/etc/nginx/conf.d/reglet.conf`：

```nginx
server {
    listen 80;
    server_name reglet.example.com;          # 或用 _ 匹配任意域名

    root /var/www/reglet;
    index index.html;

    # SPA 回落：未知路径渲染应用而不是 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 带哈希的资源内容不可变——缓存一年
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 入口文档、许可文件与 Service Worker 必须每次校验。
    # sw.js 若被长缓存，客户端会一直停留在旧 Worker 版本。
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location = /sw.js {
        add_header Cache-Control "no-cache";
    }

    location ~* \.(txt|svg)$ {
        add_header Cache-Control "public, max-age=86400";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;

    add_header X-Content-Type-Options "nosniff" always;
}
```

执行并验证：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://127.0.0.1/
curl -I http://127.0.0.1/assets/SarasaUiSC-Regular-*.ttf
```

第二条命令必须返回 `Content-Type: font/ttf`。较新的 nginx 已在 `/etc/nginx/mime.types` 中映射 TTF；若你的版本没有，请在**已有的** `types { … }` 块中补一行 `font/ttf ttf;`，不要新写一个 `types` 块——独立块会整体替换继承来的 MIME 映射，导致 CSS 与 JS 类型错误。

RHEL / CentOS 需要为目录打 SELinux 标签：`sudo chcon -Rt httpd_sys_content_t /var/www/reglet`。

#### 5.2 Windows IIS

启用 **IIS** 与 **静态内容** 功能，并安装 **URL Rewrite** 模块（回落规则需要它）。把 `dist/` 复制到 `C:\sites\reglet`，新建 `C:\sites\reglet\web.config`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <remove fileExtension=".ttf" />
      <mimeMap fileExtension=".ttf" mimeType="font/ttf" />
    </staticContent>
    <rewrite>
      <rules>
        <rule name="Reglet SPA fallback" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

创建站点（Windows Server，管理员 PowerShell）：

```powershell
New-Website -Name "Reglet" -PhysicalPath "C:\sites\reglet" -Port 8080
New-NetFirewallRule -DisplayName "Reglet" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

Windows 10/11 没有 `New-Website`，可用 IIS 管理器图形界面，或直接运行 Windows 版 Nginx 并套用 5.1 的配置。

#### 5.3 macOS

```bash
brew install nginx
# Apple Silicon: /opt/homebrew/etc/nginx/nginx.conf
# Intel:         /usr/local/etc/nginx/nginx.conf
```

把 `root` 指向 `dist/` 的绝对路径（例如 `/Users/me/sites/reglet`），复用 5.1 的 `server` 块，然后：

```bash
sudo nginx -t
brew services start nginx        # 随登录自启；临时运行可直接执行 `nginx`
```

若只想快速验证，不必安装完整服务：

```bash
caddy file-server --root dist --listen :8080
```

#### 5.4 HTTPS 与反向代理

公网部署必须启用 HTTPS：这里并没有需要保护的机密（所有生成都在本地完成），但可以避免浏览器「不安全」警告，并启用现代浏览器能力。

**Caddy** 会自动申请并续期证书。直接托管 `dist/`：

```caddyfile
reglet.example.com {
    root * /var/www/reglet
    try_files {path} /index.html
    file_server
    encode gzip zstd
}
```

或者反代已有的容器 / Nginx：

```caddyfile
reglet.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

**Nginx 使用已有证书**（例如 certbot 生成于 `/etc/letsencrypt/live/reglet.example.com/`）：

```nginx
server {
    listen 80;
    server_name reglet.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name reglet.example.com;
    ssl_certificate     /etc/letsencrypt/live/reglet.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reglet.example.com/privkey.pem;

    root /var/www/reglet;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    location = /index.html { add_header Cache-Control "no-cache"; }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml text/plain;
}
```

#### 5.5 对象存储 / CDN

把 `dist/` 的**内容**（而不是 `dist` 目录本身）上传到存储桶根目录，把索引文档设为 `index.html`，然后配置：

- `*.ttf` 的 MIME 为 `font/ttf`（若换成别的格式：`*.woff2` 用 `font/woff2`、`*.otf` 用 `font/otf`）——不少平台默认 `application/octet-stream`，会导致字体加载失败。
- `assets/*` 使用 `Cache-Control: public, max-age=31536000, immutable`。
- `index.html`、`sw.js`、`LICENSE-Sarasa.txt`、`THIRD-PARTY-NOTICES.txt` 使用 `Cache-Control: no-cache` 或较短 TTL。
- 若将来增加前端路由，把 404 映射到 `/index.html`。
- 对 `text/*`、`application/javascript`、`application/json`、`image/svg+xml` 开启 Gzip 或 Brotli。

### 6. Docker 部署

仓库自带多阶段 `Dockerfile`：Node.js 只在构建阶段使用，最终镜像里只有 Nginx 与静态文件。

```dockerfile
# 构建阶段 —— 固定为已修复 CVE-2026-111497 的版本
FROM node:22.23.4-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段：仅保留静态产物
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`.dockerignore` 是部署正确性的一部分：它把宿主机的 `node_modules/`（Windows 二进制）挡在构建上下文之外，确保容器内始终用 `npm ci` 重装 Linux 依赖；同时排除 `dist/`、`.git` 与编辑器目录，让构建上下文更小更快。

**构建并运行：**

```bash
docker build -t reglet:0.75 .
docker run -d --name reglet --restart unless-stopped -p 8080:80 reglet:0.75
```

**验证与运维：**

```bash
docker ps                              # 容器 Up，端口 8080->80
curl -I http://localhost:8080/          # 200 OK，text/html
curl -I http://localhost:8080/assets/SarasaUiSC-Regular-*.ttf   # font/ttf
docker logs -f reglet                    # 访问日志 / 错误
docker exec reglet ls /usr/share/nginx/html   # index.html 与两份许可文件
```

在宿主机打开 `http://localhost:8080/`，同一局域网的手机打开 `http://<宿主机IP>:8080/`。镜像自带 `LICENSE-Sarasa.txt` 与 `THIRD-PARTY-NOTICES.txt`（二者本就在 `dist/` 内），满足 OFL「随字体副本保留许可」的要求。

**Docker Compose**——在 Dockerfile 同目录保存为 `compose.yaml`：

```yaml
services:
  reglet:
    build: .
    image: reglet:0.75
    container_name: reglet
    restart: unless-stopped
    ports:
      - "8080:80"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1/"]
      interval: 30s
      timeout: 3s
      retries: 3
```

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
docker compose down
```

**多架构镜像**——Intel/AMD 服务器与 ARM 主机（Apple Silicon、AWS Graviton、树莓派）需要不同的镜像。`nginx:alpine` 与 `node:22.23.4-alpine` 都提供多架构 manifest，一条命令即可同时产出：

```bash
docker buildx create --name reglet-builder --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t <registry>/reglet:0.75 --push .
```

没有镜像仓库时，只按目标主机架构构建（ARM 上使用 `--platform linux/arm64`），或导出镜像文件再到目标机器导入：

```bash
docker save reglet:0.75 | gzip > reglet-0.75.tar.gz
# 复制压缩包后，在目标机器执行：
gunzip -c reglet-0.75.tar.gz | docker load
```

**自定义 Nginx 配置。** 若需调整缓存、增加安全响应头或部署到子路径，挂载配置文件即可，无需重建镜像：

```bash
docker run -d --name reglet -p 8080:80 --restart unless-stopped \
  -v /etc/reglet/default.conf:/etc/nginx/conf.d/default.conf:ro \
  reglet:0.75
```

挂载文件会替换镜像内置的 `default.conf`，因此其中必须自行包含 `try_files` 回落与 `assets` 缓存规则。

**更新运行中的部署：**

```bash
git pull
docker compose up -d --build     # 重新构建并重建容器
# 或不用 Compose：
docker build -t reglet:0.75 . && docker rm -f reglet && \
  docker run -d --name reglet --restart unless-stopped -p 8080:80 reglet:0.75
```

资源名带哈希，新旧版本不会冲突；`index.html` 每次加载都会校验，客户端能立即拿到新版本。

### 7. 多端与多平台

渲染与 PDF 生成全在浏览器内完成，部署侧只需提供静态文件。支持范围：

| 平台 | 浏览器 | 说明 |
| --- | --- | --- |
| Windows / Linux | Chrome、Edge、Firefox、Chromium ≥ 110 | 完整支持 |
| macOS | Safari 16.4+、Chrome、Firefox、Edge | 完整支持 |
| iPhone / iPad | Safari 16.4+、iOS 版 Chrome | 低于 900px 自动切换布局 |
| Android 手机 / 平板 | Chrome 110+、三星浏览器、Firefox | 低于 900px 自动切换布局 |
| 其他现代桌面浏览器 | Chromium 内核 | 可用，交互以指针为主 |

- **布局**——`max-width: 900px` 断点会把面板重排为单列；`main.tsx` 还会按 UA 添加 `.mobile` 类。断点以上的桌面布局不受影响。
- **PDF 导出在客户端完成**——手机或笔记本自己构建 PDF，因此无论访问量多大，服务器的 CPU 与内存占用都保持平稳。网格极密时会先请求确认，详见上文「安全导出」。
- **弹窗拦截**——生成的 PDF 会在新标签页打开。iOS Safari 与较严格的移动浏览器若「点了没反应」，请允许该站点的弹窗。
- **首屏体积**——`dist/` 中四个 Sarasa UI SC TTF 合计约 53 MB，但首屏不会下载任何一个：每种字形只在导出确实用到时（至少一个文字模块使用「更纱黑体」/ Sarasa Gothic 且为对应的加粗/斜体组合）才请求，并遵循 `assets/` 缓存规则；字体下载期间应用本身仍可正常操作。仅字体 Service Worker 还会把已下载的字形写入 Cache Storage，后续导出不必重新下载。首次导出纯内置常规文字时约传输 13 MB。
- **局域网访问**——同一份构建可直接在局域网内提供给手机、平板做真机验证，无需安装应用或上架。注意 Service Worker 需要安全上下文，只在 HTTPS 或 `localhost` 下注册；以普通 HTTP 局域网地址访问时会跳过，应用仍可正常使用。
- **离线使用**——本项目**不**缓存应用外壳与 HTML/JS/CSS。首次加载后由浏览器普通 HTTP 缓存覆盖后续访问（GitHub Pages 返回 `max-age=600`），Service Worker 只保留字体，使导出更快。它不是完整的离线应用，且刻意不保存其他任何数据。

### 8. 上线检查清单

- [ ] 干净检出后，Node.js 22 LTS（22.23.4+）与 `npm ci` 均能成功。
- [ ] `npm run build` 通过；`dist/` 约 53 MB，含 `index.html`、`sw.js`、`assets/`、`LICENSE-Sarasa.txt`、`THIRD-PARTY-NOTICES.txt`。
- [ ] 线上以静态文件方式提供 `dist/`——没有 Vite 开发服务器，也没有 `npm run preview`。
- [ ] Sarasa 字体文件返回 `Content-Type: font/ttf`；资源请求为 200 而非 404。
- [ ] `assets/*` 返回 `Cache-Control: public, max-age=31536000, immutable`；`index.html` 每次校验。
- [ ] `sw.js` 可从站点根（遵循 base 前缀）访问，`Content-Type: application/javascript`，且为 `Cache-Control: no-cache`。
- [ ] F12 → Application 中 Service Worker 为 `activated`，Cache Storage **只有** `reglet-fonts-v1` 且内含该次导出用到的 Sarasa TTF。
- [ ] 对 JS、CSS、JSON、SVG 开启 Gzip / Brotli。
- [ ] 已启用 HTTPS 且证书有效；HTTP 自动跳转 HTTPS。
- [ ] 已设置 `X-Content-Type-Options: nosniff`（若整域可控，再考虑 HSTS）。
- [ ] 桌面浏览器、iPhone、Android 均可正常加载并导出、打印 PDF。
- [ ] 语言自动识别正常（`zh-*` → 简体中文，其余 → English），`?lang=` 可覆盖。
- [ ] 页脚显示的版本号正确（0.75）。
- [ ] Docker：`docker ps` 中容器健康、重启策略为 `unless-stopped`，镜像内含两份许可文件。
- [ ] 若部署环境混合了 Arm 与 x86 主机，两种架构的镜像都已准备。

## 使用方式

1. 选择一套预设模板，或从空白开始。
2. 设置纸张尺寸、方向、份数、双面装订与四边留白。
3. 通过侧栏顶部的「添加模块」控件添加所需模块。
4. 调整每个模块的颜色、偏移、范围、间距及类型专属参数。
5. 点击「PDF 输出 下载」，文档会在新标签页打开，可直接打印。

## 语言自动切换

界面语言跟随浏览器语言偏好（即 HTTP `Accept-Language` 请求头的来源）：

- 中文及其衍生变体（`zh`、`zh-CN`、`zh-TW`、`zh-Hant` 等）→ **简体中文**
- 其他语言 → **English**

也可通过查询参数强制指定：`?lang=en` 或 `?lang=zh-hans`。

## 项目结构

```text
Reglet/
├─ public/
│  ├─ favicon.svg
│  └─ sw.js                # 仅缓存字体的 Service Worker
├─ src/
│  ├─ components/          # 应用级与可复用 UI 组件
│  ├─ components/elements/ # 九类模块的参数面板
│  ├─ fonts/               # 字体校验与解析
│  ├─ i18n/                # 翻译上下文与语言包 JSON
│  ├─ Sarasa/              # PDF 字体（Sarasa UI SC 常规 / 加粗 / 斜体 / 加粗斜体）与 SIL OFL 许可证
│  ├─ pdf/                 # pdfmake 构建、按需加载器、字体与预估工具
│  ├─ pwa/                 # Service Worker 注册、导出进度会话
│  ├─ store/               # Zustand 状态
│  ├─ templates/           # 预设模板数据
│  ├─ types/               # 共享 TypeScript 类型
│  ├─ utils/               # Toast 与对话框工具
│  ├─ App.tsx
│  ├─ App.css
│  └─ main.tsx
├─ Dockerfile              # 多阶段构建 → nginx:alpine
├─ .dockerignore           # 避免 node_modules/ 与 dist/ 进入构建上下文
├─ LICENSE                 # Reglet 本体的 MIT 许可证
├─ MAINTAINER-GUIDE.md     # 中英双语维护文档
├─ CHANGELOG.md            # 版本变更记录
├─ README.md
└─ vite.config.ts
```

## 维护文档

[MAINTAINER-GUIDE.md](MAINTAINER-GUIDE.md) 以中英双语记录架构、CSS 令牌、动画体系、依赖清单与组件复用关系。[CHANGELOG.md](CHANGELOG.md) 记录版本变更。

## 许可证

- **Reglet 项目本体**采用 [MIT 许可证](LICENSE)。
- **Sarasa UI SC** 提供打包的四种 PDF 字形——常规（13,104,928 字节）、加粗（12,903,080）、斜体（13,848,284）、加粗斜体（13,684,108）——遵循 **SIL Open Font License 1.1**。其中 `SarasaUiSC-Oblique.ttf` 由常规字形斜切 9.4°（与加粗斜体的斜度一致）生成：Sarasa UI SC 没有独立的常规斜体，故「只选斜体」时倾斜常规；该衍生物保留原字体族名，而 OFL 并未对此保留名称。OFL 允许子集化与修改，但项目对每种字形都整份打包、未做子集化。协议原文见 [`src/Sarasa/LICENSE-Sarasa.txt`](src/Sarasa/LICENSE-Sarasa.txt)，构建时会输出到 `dist/LICENSE-Sarasa.txt`。
- 界面本身使用 CSS `system-ui` 字体栈，不打包任何 Web 字体。
- 第三方依赖的许可证会在构建时生成到 `dist/THIRD-PARTY-NOTICES.txt`。

## 致谢

感谢 React、Vite、Zustand、pdfmake、mdui、fontkit 与 qrcode 项目，以及 Sarasa Gothic 项目提供的 Sarasa UI SC 字体。
