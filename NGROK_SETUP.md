# ngrok Tunnel Setup — EHS-OS

## Current ngrok URL
```
https://cesar-biaxial-unfearfully.ngrok-free.dev
```

## Architecture
```
Browser → ngrok (port 443) → localhost:80 (Apache/Laragon)
                                ├── /api/* → ProxyPass → localhost:8000 (Laravel)
                                └── /*     → client/dist (React SPA)
```

## Prerequisites
1. **Laragon** running (Apache + MySQL)
2. **Laravel backend** running: `cd backend && php artisan serve`
3. **ngrok** running: `ngrok http 80 --host-header=EHS.test`

## Quick-Swap: Changing the ngrok URL

When your ngrok URL changes (free tier generates a new one each restart), update these locations:

### 1. Backend `.env` (`backend/.env`)
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://ehs.test,https://NEW-URL.ngrok-free.dev
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,ehs.test,127.0.0.1,127.0.0.1:8000,NEW-URL.ngrok-free.dev
```

### 2. Vite config (`client/vite.config.ts`) — HMR host only (dev mode)
```ts
hmr: {
  protocol: 'wss',
  host: 'NEW-URL.ngrok-free.dev',
},
```

### 3. Clear Laravel cache
```bash
cd backend && php artisan config:clear
```

**No rebuild needed** — the frontend uses relative `/api` URLs so it works on any domain automatically.

## What Was Changed

| File | Change |
|---|---|
| `httpd.conf` (lines 143, 152) | Enabled `mod_proxy` and `mod_proxy_http` |
| `auto.ehs.test.conf` | Added `ProxyPass /api → localhost:8000` |
| `backend/.env` | Added ngrok to CORS_ALLOWED_ORIGINS, SANCTUM_STATEFUL_DOMAINS, FRONTEND_URL |
| `backend/config/cors.php` | Added `*.ngrok-free.dev` origin pattern |
| `backend/bootstrap/app.php` | Added `trustProxies(at: '*')` for X-Forwarded headers |
| `client/vite.config.ts` | Added `allowedHosts`, `host: true`, `hmr` config |
| `client/.env` | Created with `VITE_API_URL=/api` (relative URL strategy) |
| `client/src/services/api.ts` | Added `ngrok-skip-browser-warning` header |
| `client/src/contexts/AuthContext.tsx` | Added `ngrok-skip-browser-warning` header |
| 6 page files with raw `fetch()` | Added `ngrok-skip-browser-warning` header |

## API URL Strategy

The frontend uses **relative** `/api` URLs (via `VITE_API_URL=/api` in `client/.env`). This means:
- `http://localhost:5173/api/*` → Vite proxy → `localhost:8000` (dev mode)
- `http://ehs.test/api/*` → Apache ProxyPass → `localhost:8000` (local production)
- `https://cesar-biaxial-unfearfully.ngrok-free.dev/api/*` → ngrok → Apache → ProxyPass → `localhost:8000`

No code changes needed when switching between domains.

## Verification Checklist

```bash
# 1. Apache config test
cd /c/laragon/bin/apache/httpd-2.4.62-240904-win64-VS17/bin && ./httpd -t

# 2. Local API through Apache
curl -s http://ehs.test/api/health | head -c 200

# 3. ngrok API
curl -s -H "ngrok-skip-browser-warning: 1" https://cesar-biaxial-unfearfully.ngrok-free.dev/api/health | head -c 200

# 4. ngrok SPA (should return HTML)
curl -s -H "ngrok-skip-browser-warning: 1" https://cesar-biaxial-unfearfully.ngrok-free.dev/ | head -c 200

# 5. CORS preflight
curl -s -X OPTIONS -H "Origin: https://cesar-biaxial-unfearfully.ngrok-free.dev" -H "Access-Control-Request-Method: POST" http://localhost:8000/api/auth/login -I
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| ngrok shows "Visit Site" interstitial | Missing ngrok-skip-browser-warning header | Already added to all fetch() calls |
| CORS error in browser console | ngrok URL not in CORS_ALLOWED_ORIGINS | Update `backend/.env` and run `php artisan config:clear` |
| API returns HTML instead of JSON | ProxyPass not working | Restart Laragon after httpd.conf changes |
| "Bad Gateway" on /api | Laravel not running | Run `php artisan serve` on port 8000 |
