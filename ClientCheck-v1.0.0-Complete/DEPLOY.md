# Backend deployment

Build: `npm run build` → `dist/index.js`  
Run: `NODE_ENV=production node dist/index.js` (or `npm start`).

Set all production env vars on the host (see `.env.example` and PRODUCTION_SETUP.md). Do not commit `.env` with real secrets.

---

## Railway

1. **New project** → Deploy from GitHub (or “Empty” and connect repo).
2. **Root directory:** Set to `ClientCheck-v1.0.0-Complete` if the repo root is the parent.
3. **Build:**
   - Build command: `npm install && npm run build`
   - Output directory: (leave default; artifact is in repo)
4. **Start command:** `npm start` or `node dist/index.js`
5. **Variables:** Add every variable from `.env.example` (DATABASE_URL, JWT_*, STRIPE_*, APP_BASE_URL, etc.). Use Railway’s **Variables** tab; for MySQL use Railway’s MySQL plugin or an external URL.
6. **Public URL:** Railway assigns a URL; set `APP_BASE_URL` to it (e.g. `https://your-app.up.railway.app`). Use this same URL for Stripe webhook and for `EXPO_PUBLIC_API_BASE_URL` in the app.

---

## Render

1. **New Web Service** → Connect repo.
2. **Root directory:** `ClientCheck-v1.0.0-Complete` if needed.
3. **Build:** `npm install && npm run build`
4. **Start:** `npm start`
5. **Env:** Add all vars in Render dashboard (Environment).
6. Set `APP_BASE_URL` to the Render URL (e.g. `https://your-service.onrender.com`).

---

## Fly.io

1. **Dockerfile (optional):** A minimal Dockerfile can use `node:20-alpine`, copy `package*.json`, run `npm ci --omit=dev`, copy source, run `npm run build`, and `CMD ["node","dist/index.js"]`. Or run without Docker using `fly launch` and build/start commands.
2. **fly.toml:** Set `[env]` for NODE_ENV and any non-secret vars; use `fly secrets set` for secrets.
3. **Secrets:** `fly secrets set DATABASE_URL=... JWT_SECRET=... STRIPE_SECRET_KEY=...` etc.
4. **APP_BASE_URL:** Set to `https://<your-app>.fly.dev`.

---

## Health checks

- **Liveness:** `GET /api/health` → 200 means the process is up.
- **Readiness (if you add it):** Use a path that checks DB (e.g. a dedicated route that runs a simple query). Configure your host’s health check to hit `/api/health` for simplicity.

After deploy, run: `curl https://<APP_BASE_URL>/api/health`
