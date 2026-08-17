<p align="center">
  <img src="docs/banner.svg" width="960" alt="Sonora — self-hosted music streaming">
</p>

<div align="center">

![Stack](https://img.shields.io/badge/stack-Hono%20%E2%80%A2%20Cloudflare%20Workers%20%E2%80%A2%20D1%20%E2%80%A2%20KV-e36002?style=flat-square&labelColor=0d0d12&color=8b5cf6)
![Frontend](https://img.shields.io/badge/frontend-React%2018%20%E2%80%A2%20Vite%20%E2%80%A2%20Tailwind%20v4-61dafb?style=flat-square&labelColor=0d0d12&color=a855f7)
![Mobile](https://img.shields.io/badge/mobile-Capacitor%207%20%E2%80%A2%20Android-3ddc84?style=flat-square&labelColor=0d0d12&color=ec4899)
![Auth](https://img.shields.io/badge/auth-PBKDF2%20%E2%80%A2%20HS256%20JWT-f59e0b?style=flat-square&labelColor=0d0d12&color=f59e0b)
![CI](https://img.shields.io/badge/CI%20%E2%86%92%20APK-GitHub%20Actions-2088ff?style=flat-square&labelColor=0d0d12&color=38bdf8)
![Language](https://img.shields.io/badge/language-TypeScript-3178c6?style=flat-square&labelColor=0d0d12&color=3b82f6)

<a href="https://sonora-api.vextalor49-a5d.workers.dev"><img src="https://img.shields.io/badge/%F0%9F%94%8A%20Live%20Demo-sonora--api.vextalor49--a5d.workers.dev-8b5cf6?style=for-the-badge&labelColor=0d0d12" alt="Live demo"></a>

</div>

<div align="center" style="max-width: 760px; margin: 28px auto 0;">

Most "self-hosted" music setups demand a rented VPS, a media container, and a weekend of YAML.
**Sonora runs entirely on Cloudflare Workers** — free tier, global edge, nothing to babysit — and ships a
real **Android app with native lockscreen controls**, produced by GitHub Actions on every push.

</div>

<br>

<!-- ─────────────────────────── STAT STRIP ─────────────────────────── -->

<table align="center" style="border-collapse: separate; border-spacing: 10px; width: 100%; max-width: 980px;">
  <tr>
    <td align="center" style="background: linear-gradient(160deg, rgba(139,92,246,0.14), rgba(139,92,246,0.03)); border: 1px solid rgba(139,92,246,0.28); border-radius: 16px; padding: 18px 10px; width: 25%;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 26px; font-weight: 700; background: linear-gradient(90deg,#a78bfa,#f472b6); -webkit-background-clip: text; background-clip: text; color: transparent;">$0</div>
      <div style="color:#94a3b8; font-size: 13px; margin-top: 4px; letter-spacing: 0.4px;">server bill · free tier</div>
    </td>
    <td align="center" style="background: linear-gradient(160deg, rgba(236,72,153,0.13), rgba(236,72,153,0.03)); border: 1px solid rgba(236,72,153,0.28); border-radius: 16px; padding: 18px 10px; width: 25%;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 26px; font-weight: 700; background: linear-gradient(90deg,#f472b6,#38bdf8); -webkit-background-clip: text; background-clip: text; color: transparent;">2m 12s</div>
      <div style="color:#94a3b8; font-size: 13px; margin-top: 4px; letter-spacing: 0.4px;">push → installable APK</div>
    </td>
    <td align="center" style="background: linear-gradient(160deg, rgba(56,189,248,0.13), rgba(56,189,248,0.03)); border: 1px solid rgba(56,189,248,0.28); border-radius: 16px; padding: 18px 10px; width: 25%;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 26px; font-weight: 700; background: linear-gradient(90deg,#38bdf8,#34d399); -webkit-background-clip: text; background-clip: text; color: transparent;">300+</div>
      <div style="color:#94a3b8; font-size: 13px; margin-top: 4px; letter-spacing: 0.4px;">edge cities serve your audio</div>
    </td>
    <td align="center" style="background: linear-gradient(160deg, rgba(52,211,153,0.13), rgba(52,211,153,0.03)); border: 1px solid rgba(52,211,153,0.28); border-radius: 16px; padding: 18px 10px; width: 25%;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 26px; font-weight: 700; background: linear-gradient(90deg,#34d399,#a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent;">1 tap</div>
      <div style="color:#94a3b8; font-size: 13px; margin-top: 4px; letter-spacing: 0.4px;">from this page to the lockscreen</div>
    </td>
  </tr>
</table>

<br>

<!-- ─────────────────────────── HIGHLIGHTS ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#a78bfa,#ec4899); -webkit-background-clip: text; background-clip: text; color: transparent;">Highlights</span>

</div>

<table align="center" style="border-collapse: separate; border-spacing: 10px; width: 100%; max-width: 980px;">
  <tr>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 16px; padding: 20px 22px; width: 33.3%; vertical-align: top;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #a78bfa;">EDGE-NATIVE API</div>
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.55;">Hono on Cloudflare Workers with D1 (SQLite at the edge) and KV media staging. Deploys in seconds, scales to zero, costs ~nothing.</div>
    </td>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 16px; padding: 20px 22px; width: 33.3%; vertical-align: top;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #f472b6;">LIVE STREAMING</div>
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.55;">Chunked playback with HTTP <code>Range</code> support and in-memory seeking — instant scrubbing, zero buffering tricks, true streaming from day one.</div>
    </td>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 16px; padding: 20px 22px; width: 33.3%; vertical-align: top;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #38bdf8;">GLASSMORPHIC UI</div>
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.55;">React 18 + Tailwind v4 on a violet-on-black canvas: blur panels, floating now-playing bar, responsive from desktop down to the smallest phone.</div>
    </td>
  </tr>
  <tr>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 16px; padding: 20px 22px; width: 33.3%; vertical-align: top;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #34d399;">NATIVE ANDROID</div>
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.55;">Capacitor 7 shell with a custom <code>MediaSession</code> plugin — lockscreen artwork, transport buttons, seek bar, and a foreground service with notification controls.</div>
    </td>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 16px; padding: 20px 22px; width: 33.3%; vertical-align: top;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #f59e0b;">PUSH-BUTTON CI</div>
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.55;">Every push compiles the web client, syncs it into the shell, and uploads an <code>app-debug.apk</code> artifact — permanently signed, so each build installs cleanly over the last.</div>
    </td>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 16px; padding: 20px 22px; width: 33.3%; vertical-align: top;">
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 2px; color: #e879f9;">SECURITY FIRST</div>
      <div style="font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #cbd5e1; margin-top: 8px; line-height: 1.55;">PBKDF2-hashed passwords (WebCrypto), HS256 JWTs, role-based access — and the first account to register automatically becomes admin.</div>
    </td>
  </tr>
</table>

<br>

<!-- ─────────────────────────── ARCHITECTURE ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#38bdf8,#a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent;">Architecture</span>

</div>

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
│   /api/artwork   covers (processed thumbnails)                          │
│                                                                         │
│   ┌─────────────┐        ┌──────────────────┐        ┌──────────────┐  │
│   │  D1 (SQL)   │        │  KV_MEDIA        │        │  Files/R2    │  │
│   │  users,     │        │  audio/art bytes │        │  (optional)  │  │
│   │  songs,     │        │  24h staging TTL │        │  permanent   │  │
│   │  favorites  │        └──────────────────┘        └──────────────┘  │
│   └─────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

<br>

<!-- ─────────────────────────── GETTING STARTED ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#a78bfa,#f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent;">Getting started</span>

</div>

<details open>
<summary><b style="font-family: 'Segoe UI', sans-serif; color: #c084fc;">1 · Deploy the API (Cloudflare Workers)</b></summary>

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

> **Tip:** bootstrap disabled? No problem — the **first account to register becomes ADMIN** automatically.

</details>

<details open>
<summary><b style="font-family: 'Segoe UI', sans-serif; color: #c084fc;">2 · Run the web client locally</b></summary>

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

</details>

<details open>
<summary><b style="font-family: 'Segoe UI', sans-serif; color: #c084fc;">3 · Build the Android app</b></summary>

GitHub Actions (`Push to master → Build Android APK`) compiles the web client, copies it into the
Capacitor shell, and uploads an installable, **permanently-signed** `app-debug.apk` as an artifact —
pull it from the run page and install it on any Android 8+ device.

Local builds work too:

```bash
cd frontend && npm run build
cd ../mobile
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android          # first time only (android/ is committed)
npx cap sync android
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/
```

</details>

<details open>
<summary><b style="font-family: 'Segoe UI', sans-serif; color: #c084fc;">4 · Add your music</b></summary>

```
POST /api/admin/songs          multipart: file + metadata (title, artist, album, genre, artwork)
GET  /api/admin/songs/upload   presigned upload → KV staging, auto-finalized after 24 h
```

</details>

<br>

<!-- ─────────────────────────── API REFERENCE ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#ec4899,#38bdf8); -webkit-background-clip: text; background-clip: text; color: transparent;">API reference</span>

</div>

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

<br>

<!-- ─────────────────────────── TECH STACK ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#34d399,#a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent;">Tech stack</span>

</div>

<table align="center" style="border-collapse: separate; border-spacing: 10px; width: 100%; max-width: 900px;">
  <tr>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 14px; padding: 14px 20px; width: 50%;">
      <span style="display:inline-block; background: rgba(139,92,246,0.18); border: 1px solid rgba(139,92,246,0.35); color:#c4b5fd; border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; font-family: 'Segoe UI', sans-serif;">API</span>
      <span style="color:#cbd5e1; font-size: 14px; margin-left: 10px;">Hono 4 · Cloudflare Workers · D1 · KV · wrangler 3</span>
    </td>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 14px; padding: 14px 20px; width: 50%;">
      <span style="display:inline-block; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.35); color:#7dd3fc; border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; font-family: 'Segoe UI', sans-serif;">WEB</span>
      <span style="color:#cbd5e1; font-size: 14px; margin-left: 10px;">React 18 · Vite 5 · TypeScript · Tailwind v4 · Zustand · Router 6</span>
    </td>
  </tr>
  <tr>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 14px; padding: 14px 20px; width: 50%;">
      <span style="display:inline-block; background: rgba(236,72,153,0.15); border: 1px solid rgba(236,72,153,0.35); color:#f9a8d4; border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; font-family: 'Segoe UI', sans-serif;">MOBILE</span>
      <span style="color:#cbd5e1; font-size: 14px; margin-left: 10px;">Capacitor 7 · `com.sonora.app` · custom MediaSession plugin · FGS</span>
    </td>
    <td style="background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border: 1px solid rgba(139,92,246,0.22); border-radius: 14px; padding: 14px 20px; width: 50%;">
      <span style="display:inline-block; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35); color:#fcd34d; border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; font-family: 'Segoe UI', sans-serif;">SECURITY</span>
      <span style="color:#cbd5e1; font-size: 14px; margin-left: 10px;">PBKDF2 (WebCrypto) · HS256 JWT · role-based access</span>
    </td>
  </tr>
</table>

<br>

<!-- ─────────────────────────── REPOSITORY ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#f59e0b,#ec4899); -webkit-background-clip: text; background-clip: text; color: transparent;">Repository layout</span>

</div>

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
├── docs/banner.svg          # this README's animated banner
└── .github/workflows/android.yml     # push → APK artifact
```

<br>

<!-- ─────────────────────────── ROADMAP ─────────────────────────── -->

<div align="center">

## <span style="font-family: 'Segoe UI', sans-serif; font-weight: 700; background: linear-gradient(90deg,#a78bfa,#38bdf8); -webkit-background-clip: text; background-clip: text; color: transparent;">Roadmap</span>

</div>

- [ ] Screenshot gallery (drop captures in `docs/screenshots/`)
- [ ] R2-backed permanent media storage (beyond KV's 25 MB object cap)
- [ ] Playlist "add to queue" flow and party mode
- [ ] Official signing config → Play Store–grade release builds
- [ ] MediaSession→web `seek` round-trip tuning across Android OEMs

<br>

<hr style="border: none; height: 1px; background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(236,72,153,0.5), transparent);">

<div align="center" style="font-family: 'Segoe UI', sans-serif; color: #64748b; font-size: 13px; letter-spacing: 1px; margin-top: 18px;">

**Sonora** — stream your music. Own your cloud.

</div>
