<div align="center">

# Sonora

**A self-hosted music streaming platform — deployed on Cloudflare's edge, delivered to your pocket.**

![Stack](https://img.shields.io/badge/stack-Hono%20%7C%20Cloudflare%20Workers%20%7C%20D1%20%7C%20KV-e36002?style=flat-square&labelColor=0d0d12&color=8b5cf6)
![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind%20v4-61dafb?style=flat-square&labelColor=0d0d12&color=a855f7)
![Mobile](https://img.shields.io/badge/mobile-Capacitor%207%20%7C%20Android%20APK-3ddc84?style=flat-square&labelColor=0d0d12&color=ec4899)
![Auth](https://img.shields.io/badge/auth-PBKDF2%20%2B%20HS256%20JWT-f59e0b?style=flat-square&labelColor=0d0d12&color=f59e0b)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions%20%E2%86%92%20APK-2088ff?style=flat-square&labelColor=0d0d12&color=38bdf8)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178c6?style=flat-square&labelColor=0d0d12&color=3b82f6)

**Live demo → [https://sonora-api.vextalor49-a5d.workers.dev](https://sonora-api.vextalor49-a5d.workers.dev)**

*Violet-on-black. Glassmorphic. Zero server to rent. Zero ads. Yours.*

</div>

---

## Why Sonora?

Most "self-hosted" music setups still demand a rented VPS, a media container, and a weekend of YAML. Sonora runs entirely on **Cloudflare Workers** — free tier, global edge, no server to manage — and ships a real **Android app with native lockscreen controls**, built for you by GitHub Actions on every push.

Stop renting. Stream from the edge.

---

## Features

| | |
|---|---|
| **Edge-native backend** | Hono API on Cloudflare Workers with D1 (SQLite at the edge) + KV for media staging. Costs ~nothing to run. |
| **Live streaming** | Chunked audio playback with HTTP `Range` support and in-memory seek — instant scrubbing, no client buffering tricks. |
| **Glassmorphic UI** | React 18 + Tailwind v4 interface: violet-on-black theme, blur panels, floating now-playing bar, full mobile layouts. |
| **Native Android app** | Capacitor 7 wrapper with a custom **MediaSession plugin** — lockscreen artwork, transport buttons, seek bar, and a foreground service with notification controls. |
| **Push-button CI** | GitHub Actions builds `app-debug.apk` with a **commit-locked signing keystore** — every push produces an artifact that installs cleanly **over** the previous build. |
| **Authentication** | PBKDF2-hashed passwords (WebCrypto), HS256 JWTs, role-based admin. First registered user becomes admin automatically. |
| **Admin uploads** | Upload songs and artwork through the API with KV staging (24 h TTL), deduplicated hashes, and automatic 320 KB cover thumbnail processing. |
| **Touch-native web** | Safe-area insets, hidden scrollbars on touch devices, haptics on playback, no zoom/selection callouts — the web build *feels* like an app. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                               Clients                                    │
│                                                                          │
│   ┌────────────────────┐   ┌──────────────────────────────────────────┐ │
│   │  Web (Vite SPA)    │   │  Android (Capacitor 7)                   │ │
│   │  React / Zustand   │   └───────────────┬──────────────────────────┘ │
│   └─────────┬──────────┘                   │ MediaSessionPlugin        │
└─────────────┼──────────────────────────────┼───────────────────────────┘
              │ HTTPS + JWT                  │ (lockscreen / notification)
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Cloudflare Workers — Hono API  (cors, auth)              │
│                                                                         │
│   /api/auth      register · login · me · bootstrap                      │
│   /api/songs     browsing, favorites, streaming (Range)                 │
│   /api/library   genres, albums, artists                                │
│   /api/admin     song + artwork upload (KV staging → D1)                │
│   /api/artwork   covers (resized thumbnails)                            │
│                                                                         │
│   ┌─────────────┐        ┌──────────────────┐        ┌──────────────┐  │
│   │  D1 (SQL)   │        │  KV_MEDIA        │        │  Files/R2    │  │
│   │  users,     │        │  audio/art bytes │        │  (optional)  │  │
│   │  songs,     │        │  24h staging TTL │        │  permanent   │  │
│   │  favorites  │        └──────────────────┘        └──────────────┘  │
│   └─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Screenshots

*Drop your captures in `docs/screenshots/` and embed them here — the README is a living document.*

```
docs/screenshots/web-home.png      docs/screenshots/web-player.png
docs/screenshots/android-lock.png  docs/screenshots/android-player.png
```

---

## Getting started

### 1. Deploy the API (Cloudflare Workers)

```bash
cd workers
npm install

# one-time: create the database and KV namespace
npx wrangler d1 create sonora-db            # → copy the database_id into wrangler.jsonc
npx wrangler kv namespace create KV_MEDIA   # → copy the id into wrangler.jsonc

# secrets (used by the /api/auth/bootstrap endpoint)
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD

# migrate + bootstrap the admin account, then deploy to the edge
npm run migrate
curl -X POST $WORKER_URL/api/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}'

npm run deploy
```

> First-run tip: if bootstrap is disabled, the **first account to register automatically becomes ADMIN**.

### 2. Run the web client locally

```bash
cd frontend
npm install

# point the client at your deployed worker:
# (Windows PowerShell)
$env:VITE_API_URL = "https://sonora-api.vextalor49-a5d.workers.dev"
# (macOS / Linux)
export VITE_API_URL="https://sonora-api.vextalor49-a5d.workers.dev"

npm run dev       # open http://localhost:5173
npm run build     # typed production build → dist/
```

### 3. Build the Android app

GitHub Actions (`Push to master → Build Android APK`) compiles the web client, copies it into the Capacitor shell, and uploads an installable, **permanently-signed** `app-debug.apk` as an artifact — pull it from the run page and install it on any Android 8+ device.

Local builds work too:

```bash
cd frontend && npm run build
cd ../mobile
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android          # first time only (android/ is committed)
npx cap sync android
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/
```

### 4. Add your music

```
POST /api/admin/songs          multipart: file + metadata (title, artist, album, genre, artwork)
GET  /api/admin/songs/upload   presigned upload → KV staging, auto-finalized after 24 h
```

---

## API reference

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create account (first user → ADMIN) | — |
| `POST` | `/api/auth/login` | Exchange credentials for a JWT | — |
| `POST` | `/api/auth/bootstrap` | Seed admin via `ADMIN_EMAIL`/`ADMIN_PASSWORD` secrets | Secret |
| `GET` | `/api/auth/me` | Current user profile | JWT |
| `GET` | `/api/songs` | List songs with filters, pagination | JWT |
| `GET` | `/api/songs/:id/stream` | Chunked audio stream (HTTP `Range`) | JWT |
| `PUT` | `/api/songs/:id/favorite` | Toggle favorite | JWT |
| `GET` | `/api/library/genres` · `/artists` · `/albums` | Browse library | JWT |
| `POST` | `/api/admin/songs` | Upload song + artwork | ADMIN |
| `GET` | `/api/artwork/:id` | Cover image (processed thumbnails) | JWT |
| `GET` | `/health` | Liveness probe | — |

---

## Tech stack

| Layer | Tools |
|---|---|
| API | Hono 4 · Cloudflare Workers · D1 · KV · wrangler 3 |
| Web | React 18 · Vite 5 · TypeScript · Tailwind CSS v4 · Zustand · React Router 6 · lucide-react |
| Mobile | Capacitor 7 (`com.sonora.app`) · custom `MediaSession` plugin · foreground service · stable debug keystore |
| CI/CD | GitHub Actions — `Push to master → build → APK artifact` |
| Security | PBKDF2 (WebCrypto) · HS256 JWT · role-based access |

---

## Repository layout

```
├── workers/                 # Edge API — Hono on Cloudflare Workers
│   ├── src/
│   │   ├── index.ts         # router + CORS
│   │   ├── auth.ts          # PBKDF2, JWT signing, guards
│   │   ├── db.ts            # D1 queries
│   │   ├── routes/          # auth · songs · library · admin
│   │   └── scripts/         # maintenance / seeding
│   └── migrations/0001_init.sql
├── frontend/                # Web client — React + Vite + Tailwind
│   └── src/
│       ├── pages/           # Home, Library, Search, Player…
│       ├── components/
│       ├── hooks/useAudioEngine.ts   # playback engine + media session bridge
│       └── mediaSession.ts           # Capacitor ↔ WebView bridge
├── mobile/                  # Android shell (Capacitor 7)
│   └── android/app/src/main/java/com/sonora/app/
│       ├── MediaSessionPlugin.java   # lockscreen / notification controls
│       ├── MediaSessionState.java    # shared state + notification builder
│       ├── MediaSessionService.java  # foreground service (mediaPlayback)
│       └── MediaActionReceiver.java  # media-button events
└── .github/workflows/android.yml     # push → APK artifact
```

---

## Roadmap

- [ ] Screenshot gallery in this README
- [ ] R2-backed permanent media storage (beyond KV's 25 MB object cap)
- [ ] Playlist "add to queue" flow and party mode
- [ ] Official signing config → Play Store–grade release builds
- [ ] MediaSession→web `seek` round-trip tuning on all Android OEMs

---

<div align="center">

**Sonora** — stream your music. Own your cloud.

</div>