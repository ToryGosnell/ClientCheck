# Deploy ClientCheck backend to Railway

Your backend is **already** in this repo (TypeScript → built to `dist/index.js`). Do **not** add a new `server.js`; use the steps below.

---

## Step 1 — package.json (already correct)

In **ClientCheck-v1.0.0-Complete/package.json** you already have:

```json
"scripts": {
  "start": "NODE_ENV=production node dist/index.js",
  "build": "esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  ...
}
```

The backend entry is **dist/index.js** (built from `server/_core/index.ts`). No change needed.

---

## Step 2 — Dependencies (already installed)

Express, CORS, dotenv (and more) are already in **package.json**. No need to run `npm install express cors dotenv`.

---

## Step 3 — Procfile (added)

A **Procfile** in this folder tells Railway how to run the app:

```
web: npm start
```

---

## Step 4 — Push to GitHub

From the **repo root** (one level above ClientCheck-v1.0.0-Complete):

```bash
git add .
git commit -m "add Procfile for Railway"
git push origin main
```

---

## Step 5 — Deploy on Railway

1. Go to **[railway.app](https://railway.app)** → **New Project** → **Deploy from GitHub Repo**.
2. Select **ToryGosnell/ClientCheck**.
3. **Important:** Set **Root Directory** to **`ClientCheck-v1.0.0-Complete`** (so Railway uses the folder that has package.json and the backend).
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start` (or leave blank; Procfile sets `web: npm start`).
6. In **Variables**, add your env vars (at least):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SESSION_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `APP_BASE_URL` (set this **after** deploy — see Step 6)

---

## Step 6 — Backend URL and app

After deployment, Railway gives you a URL like:

**https://clientcheck-production.up.railway.app**

1. In Railway **Variables**, set:
   - `APP_BASE_URL` = `https://your-actual-app.up.railway.app` (use the URL Railway shows).
2. In your **app** (EAS secrets or `.env`), set:
   - `EXPO_PUBLIC_API_BASE_URL` = that same URL (no trailing slash).

Test the API:

```bash
curl https://your-actual-app.up.railway.app/api/health
```

You should see: `{"ok":true,"platform":"ClientCheck",...}`

---

## Checklist

- [ ] Root Directory = **ClientCheck-v1.0.0-Complete**
- [ ] Build = **npm install && npm run build**
- [ ] Start = **npm start** (or Procfile)
- [ ] Variables set (DATABASE_URL, JWT_*, STRIPE_*, APP_BASE_URL)
- [ ] EXPO_PUBLIC_API_BASE_URL in app = Railway URL

More detail: **DEPLOY.md** and **PRODUCTION_SETUP.md**.
