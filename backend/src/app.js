import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import clientRoutes from './routes/client.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import adSetRoutes from './routes/adSet.routes.js';
import creativeStrategyRoutes from './routes/creativeStrategy.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiError } from './utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, '../public');

const app = express();

// Trust reverse proxy (Render load balancer / Cloudflare)
app.set('trust proxy', 1);

// Enable Security HTTP headers with CSP disabled to allow Vite bundled assets and Google Fonts
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Parse allowed client origins from CLIENT_URL (supports optional custom domain or dev origins)
const getAllowedOrigins = () => {
  const configured = env.CLIENT_URL || '';
  const origins = configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // In non-production, include common local Vite dev origins
  if (env.NODE_ENV !== 'production') {
    if (!origins.includes('http://localhost:5173')) origins.push('http://localhost:5173');
    if (!origins.includes('http://localhost:3000')) origins.push('http://localhost:3000');
    if (!origins.includes('http://127.0.0.1:5173')) origins.push('http://127.0.0.1:5173');
    if (!origins.includes('http://localhost:5000')) origins.push('http://localhost:5000');
  }

  return origins;
};

const allowedOrigins = getAllowedOrigins();

// Enable CORS on API routes with credentials support
const corsMiddleware = cors((req, callback) => {
  const origin = req.headers.origin;
  let isAllowed = false;

  if (!origin) {
    // Same-origin requests, curl, mobile apps, server-to-server
    isAllowed = true;
  } else {
    const normalized = origin.replace(/\/$/, '');
    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    let isSameHost = false;
    if (reqHost) {
      try {
        const originHost = new URL(origin).host;
        isSameHost = originHost.toLowerCase() === reqHost.toLowerCase();
      } catch {
        // Ignore URL parse error
      }
    }

    if (isSameHost || allowedOrigins.length === 0 || allowedOrigins.includes(normalized)) {
      isAllowed = true;
    }
  }

  callback(null, {
    origin: isAllowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
});

// Body parsers
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Cookie parser
app.use(cookieParser());

// Primary Health check endpoints for Render and uptime monitoring
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    success: true,
    message: 'Vytalis Media CRM API is running'
  });
});

// ==========================================
// BACKEND API ROUTES
// ==========================================
app.use('/api', corsMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ad-sets', adSetRoutes);
app.use('/api/creative-strategy', creativeStrategyRoutes);
app.use('/api/notifications', notificationRoutes);

// Explicit 404 for unhandled API routes so they are NEVER intercepted by React SPA fallback
app.use('/api', (req, res, next) => {
  next(new ApiError(404, `API endpoint '${req.originalUrl}' not found.`));
});

// ==========================================
// FRONTEND STATIC SERVING & SPA FALLBACK
// ==========================================
// Serve production static assets from backend/public/
app.use(express.static(publicPath));

// Explicit 404 for missing static assets so they NEVER hit the React SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/assets/') || path.extname(req.path)) {
    return res.status(404).type('text/plain').send(`Static asset '${req.originalUrl}' not found.`);
  }
  next();
});

// React SPA fallback: Serve index.html for all non-API GET routes (e.g. /, /login, /dashboard, etc.)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(publicPath, 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).send('Frontend production build not found in backend/public. Run npm run build first.');
      }
    });
  }
  next(new ApiError(404, `Route '${req.originalUrl}' not found.`));
});

// Centralized error handling
app.use(errorHandler);

export default app;
