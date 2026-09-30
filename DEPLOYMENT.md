# Vytalis Media CRM — Single Render Web Service Deployment Guide

This document outlines the exact, step-by-step instructions to deploy the entire Vytalis Media CRM as **ONE unified Render Web Service** (Express backend serving the compiled React SPA) backed by **MongoDB Atlas**.

---

## 1. Target Architecture Overview

```
[ User Browser ]
       │
       ▼ HTTPS (Single Domain)
[ Render Web Service ] (Node.js + Express)
       │
       ├─ /api/*       ──► Express REST API & SSE notification streams
       ├─ /health      ──► Uptime & database health check
       └─ /*           ──► Serves React production SPA from backend/public/index.html
       │
       ▼ TLS (mongodb+srv://)
[ MongoDB Atlas Cluster ]
```

- **Single Domain:** Frontend and backend share the exact same host origin.
- **No Cross-Origin Issues:** Cookies operate in same-origin mode (`sameSite: 'lax'`), removing third-party cookie restrictions.
- **Zero Separate Static Site Cost:** A single Render service runs both the API and the web frontend.

---

## 2. How the Frontend Build Gets into `backend/public/`

The deployment pipeline is fully automated and cross-platform:

1. In [`frontend/package.json`](frontend/package.json), the build command is:
   ```json
   "build": "vite build && node copy-build.js"
   ```
   - Vite compiles the React SPA into `frontend/dist/`.
   - [`frontend/copy-build.js`](frontend/copy-build.js) automatically cleans and syncs `frontend/dist/` into `backend/public/`.

2. In [`backend/package.json`](backend/package.json), the build command is:
   ```json
   "build": "npm --prefix ../frontend install && npm --prefix ../frontend run build"
   ```
   - When run from `backend/`, npm uses the `--prefix` flag to install frontend packages and execute the frontend build without needing shell-specific commands.

3. In [`backend/src/app.js`](backend/src/app.js):
   - Express statically serves `backend/public/` using `express.static(publicPath)`.
   - Any non-API GET route (`/`, `/login`, `/dashboard`, `/creative-strategy`, etc.) falls back to `backend/public/index.html` via Express SPA routing.
   - Any missing API route (`/api/*`) returns a clean JSON `404` error and is never intercepted by the HTML fallback.

---

## 3. MongoDB Atlas Requirements

1. **Cluster**: M0 (Free Tier) or higher cluster in MongoDB Atlas.
2. **Database User**: Create a user with `readWrite` access to the `vytalis_crm` database. Ensure password uses URL-safe characters or is properly URL-encoded.
3. **Network Access / IP Whitelist**:
   - Go to **Network Access** → **Add IP Address**.
   - Add `0.0.0.0/0` (Allow Access from Anywhere) because Render uses dynamic IP addresses.
4. **Connection String**:
   - Under **Clusters** → **Connect** → **Drivers** (Node.js 5.5+), copy the SRV connection URI:
     ```
     mongodb+srv://<username>:<password>@<cluster-url>/vytalis_crm?retryWrites=true&w=majority
     ```

---

## 4. Exact Render Web Service Settings

On the Render Dashboard, click **New +** → **Web Service**:

| Setting | Exact Value |
| :--- | :--- |
| **Service Type** | **Web Service** |
| **Name** | `vytalis-media-crm` (or your preferred name) |
| **Region** | Nearest to your MongoDB Atlas cluster (e.g. Singapore, Frankfurt, Oregon) |
| **Branch** | `main` |
| **Root Directory** | `.` *(leave blank or enter `.`, repo root)* |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/health` |
| **Auto-Deploy** | `Yes` |

---

## 5. Exact Environment Variable Names Required

In your Render Web Service dashboard under **Environment Variables**, configure the following:

| Variable Name | Required | Description | Example / Recommended Value |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | Execution mode | `production` |
| `PORT` | Auto | Render automatically sets this | `5000` or leave default |
| `MONGO_URI` | **Yes** | MongoDB Atlas SRV URI | `mongodb+srv://user:pass@cluster.mongodb.net/vytalis_crm?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Secret for signing auth tokens (min 16 chars) | Strong 32+ character random string |
| `JWT_EXPIRES_IN` | No | Token cookie expiry duration | `1d` |
| `ADMIN_ACCESS_KEY` | **Yes** | Master key for creating Admin accounts | Strong 8+ character password |
| `CLIENT_URL` | No | *(Optional)* Custom domain or dev origins | Leave blank for same-origin production |
| `REDIS_URL` | No | *(Optional)* Redis server URL | Leave blank (in-memory rate limiter is active) |
| `USE_CUSTOM_DNS` | No | Custom DNS override | `false` |

*(Note: `VITE_API_URL` is **NOT** needed in production because the frontend defaults to same-origin `/api` automatically).*

---

## 6. Local Development Workflow (Preserved)

Local development remains completely unaffected:

1. **Backend Server**:
   ```bash
   cd backend
   npm run dev
   # Runs on http://localhost:5000
   ```
2. **Frontend Vite Dev Server**:
   ```bash
   cd frontend
   npm run dev
   # Runs on http://localhost:5173 with HMR
   # Automatically targets http://localhost:5000/api in dev mode
   ```

---

## 7. Post-Deployment Verification Checklist

Once the Render Web Service deployment finishes, verify the live deployment:

- [ ] **Health Endpoint**: `https://your-service.onrender.com/health` returns:
  ```json
  { "status": "ok", "database": "connected", "timestamp": "..." }
  ```
- [ ] **Root Route**: `https://your-service.onrender.com/` serves the React landing/dashboard.
- [ ] **SPA Routes**: Direct navigation and browser refresh on `https://your-service.onrender.com/login` and `/creative-strategy` load the React app without 404s.
- [ ] **API Protection**: `https://your-service.onrender.com/api/some-invalid-route` returns a JSON 404 (`{"success":false,"message":"API endpoint '/api/some-invalid-route' not found."}`).
- [ ] **Authentication**: Register an Admin account with `ADMIN_ACCESS_KEY`. Verify the `token` cookie is set as `HttpOnly`.
- [ ] **Real-Time SSE Streams**: Navigate to Creative Strategy workspace. Check DevTools Network tab to verify `/api/creative-strategy/stream` maintains an open SSE connection with keepalive comments.
- [ ] **Full Creative Lifecycle**: Launch creative → 72h observation → Performance report → Creative analysis → Brief → Production → Review → Final approval → Next cycle spawn.
