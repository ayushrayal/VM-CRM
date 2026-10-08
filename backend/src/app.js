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
import croRoutes from './routes/cro.routes.js';
import creativeRoutes from './routes/creative.routes.js';
import projectionRoutes from './routes/projection.routes.js';
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

// ==========================================
// 1. CORS CONFIGURATION (MUST BE TOP-LEVEL)
// ==========================================
const getAllowedOrigins = () => {
  const configured = env.CLIENT_URL || '';
  const origins = configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Explicitly allow local development origins and ports
  const localOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ];

  for (const o of localOrigins) {
    if (!origins.includes(o)) {
      origins.push(o);
    }
  }

  return origins;
};

const allowedOrigins = getAllowedOrigins();

const corsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;

  // Requests without Origin header (curl, mobile apps, same-origin navigation)
  if (!origin) {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
    });
  }

  const normalized = origin.replace(/\/$/, '');

  // 1. Explicitly configured origins from env or local development
  if (allowedOrigins.includes(normalized)) {
    return callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
    });
  }

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    const serverHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();

    // 2. Same-origin match: Origin host matches server's Host / X-Forwarded-Host header
    if (serverHost && originHost === serverHost) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
      });
    }

    // 3. Render deployment domains (*.onrender.com)
    if (originHost.endsWith('.onrender.com')) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
      });
    }

    // 4. Localhost / local IP match
    if (
      originUrl.hostname === 'localhost' ||
      originUrl.hostname === '127.0.0.1' ||
      originUrl.hostname === '0.0.0.0'
    ) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
      });
    }

    // 5. Dynamic match against allowedOrigins hostnames
    for (const allowed of allowedOrigins) {
      if (allowed.startsWith('http')) {
        if (new URL(allowed).host.toLowerCase() === originHost) {
          return callback(null, {
            origin: true,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
          });
        }
      }
    }
  } catch {
    // Ignore parse failure
  }

  // Gracefully disallow third-party origin without throwing a 500 JSON error
  return callback(null, { origin: false });
};

// Apply CORS globally before body parsers and before all routes
app.use(cors(corsOptionsDelegate));
app.options(/.*/, cors(corsOptionsDelegate));

// ==========================================
// 2. SAFE DIAGNOSTIC LOGGING (NON-SENSITIVE)
// ==========================================
app.use((req, res, next) => {
  const origin = req.headers.origin || 'no-origin';
  res.on('finish', () => {
    if (req.originalUrl?.startsWith('/api')) {
      console.log(`[HTTP Diagnostic] ${req.method} ${req.originalUrl} | Origin: ${origin} | Status: ${res.statusCode}`);
    }
  });
  next();
});

// ==========================================
// 3. BODY & COOKIE PARSERS
// ==========================================
// 10mb limit to support high-res base64 CRO screenshot uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ==========================================
// 4. HEALTH CHECK ENDPOINTS
// ==========================================
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
// 5. BACKEND API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ad-sets', adSetRoutes);
app.use('/api/creative-strategy', creativeStrategyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cro', croRoutes);
app.use('/api/creative', creativeRoutes);
app.use('/api/projections', projectionRoutes);

// Explicit 404 for unhandled API routes so they are NEVER intercepted by React SPA fallback
app.use('/api', (req, res, next) => {
  next(new ApiError(404, `API endpoint '${req.originalUrl}' not found.`));
});

// ==========================================
// 6. FRONTEND STATIC SERVING & SPA FALLBACK
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
