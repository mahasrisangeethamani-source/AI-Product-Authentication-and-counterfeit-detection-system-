# 🛡️ AuthentiGuard AI — Vercel Deployment

This version combines frontend + backend into ONE project so it deploys entirely on Vercel (no separate hosting needed).

## 📁 Structure
```
vercel-auth/
├── index.html          🎀 Frontend page
├── style.css            🎀 Pink theme styles
├── script.js             🎀 Frontend logic (calls /api/*)
├── package.json
└── api/                  🧠 Serverless backend functions
    ├── health.js         → GET /api/health
    ├── verify.js         → POST /api/verify
    ├── history.js        → GET/DELETE /api/history
    └── _lib/
        └── detection.js  → shared AI scoring logic
```

## 🚀 How to deploy on Vercel

1. **Push this whole folder to a GitHub repository**
   - Create a new repo (e.g. `authentiguard-ai`)
   - Upload ALL these files, keeping the folder structure exactly as-is
   - The `api` folder must stay named `api` at the project root — Vercel auto-detects it

2. **Go to [vercel.com](https://vercel.com) and sign in with GitHub**

3. Click **"Add New" → "Project"**

4. Select your GitHub repository and click **Import**

5. Leave all settings as default (Framework Preset: "Other") and click **Deploy**

6. Wait ~1 minute — Vercel will give you a live URL like:
   ```
   https://authentiguard-ai.vercel.app
   ```

7. Open that URL — the frontend AND backend both work from the same domain, no extra configuration needed! ✅

## ⚠️ Important note on scan history
Vercel functions are **serverless** — they don't run continuously like a normal server. The "Recent Scans" history is stored in memory, so it may reset after periods of inactivity or on a fresh server instance. This is expected behavior for a free-tier serverless demo, not a bug.

## 🔍 Test the API directly
Once deployed, visit:
```
https://your-app.vercel.app/api/health
```
You should see the JSON health check response.
