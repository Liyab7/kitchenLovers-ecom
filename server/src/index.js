import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { UPLOADS_DIR } from './config/paths.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/error.js';
import { globalLimiter } from './middlewares/rateLimiters.js';
import { initSocket } from './services/socket.service.js';
import { runSeed } from './utils/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Try every plausible location for client/dist. Render's cwd depends on whether the
// service was set up with rootDir=. (repo root) or rootDir=server. Workspace installs
// can also hoist things differently. We pick the first path that actually has index.html.
const CLIENT_DIST_CANDIDATES = [
  path.resolve(__dirname, '../../client/dist'),       // server/src → repo/client/dist
  path.resolve(__dirname, '../client/dist'),          // server/src → server/client/dist (unlikely)
  path.resolve(process.cwd(), 'client/dist'),         // cwd = repo root
  path.resolve(process.cwd(), '../client/dist'),      // cwd = server/, dist is sibling
  '/opt/render/project/src/client/dist',              // Render absolute path
];
const CLIENT_DIST = CLIENT_DIST_CANDIDATES.find((p) => fs.existsSync(path.join(p, 'index.html')));
const hasClientBuild = !!CLIENT_DIST;

const app = express();

// Origins that serve user-uploaded media (product/category/banner images).
//
// Every entry here MUST be allowed by BOTH img-src and connect-src — see below.
// Add new CDNs to this one list so the two directives can never drift apart.
const MEDIA_ORIGINS = ['https://res.cloudinary.com'];

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        // <img> tags rendered by the page are governed by img-src.
        imgSrc: ["'self'", 'data:', 'blob:', ...MEDIA_ORIGINS],
        // The service worker re-issues those same image requests with fetch() from
        // inside the worker, and fetch() is governed by connect-src — NOT img-src.
        // Leaving media origins out of connect-src looks fine on a first visit and
        // then breaks every CDN image the moment the service worker takes control,
        // because the worker's fetch is blocked and respondWith() rejects.
        connectSrc: ["'self'", 'ws:', 'wss:', ...MEDIA_ORIGINS],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        workerSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
      },
    },
  })
);
// This service serves the SPA and the API on one origin, so most traffic is same-origin.
// Two subtleties make a naive allow-list dangerous here:
//   1. Browsers send an Origin header on same-origin POST/PUT/DELETE, and `<script
//      type="module">` is always fetched in CORS mode — so even loading the app's own
//      bundle presents an Origin.
//   2. Rejecting by calling back with an Error turns that into a 500 from the error
//      handler, which takes down the whole page rather than just failing a CORS check.
// So: always accept an Origin that matches the host we were reached on, and refuse
// unknown origins by omitting the CORS headers (cb(null, {origin: false})) instead of
// erroring. A missing or stale CLIENT_URL can then never stop the app from loading.
const sameOriginAsRequest = (origin, host) => {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

app.use(
  cors((req, cb) => {
    const origin = req.headers.origin;
    const allowed =
      !origin || // non-browser clients and plain navigations send no Origin
      sameOriginAsRequest(origin, req.headers.host) ||
      env.allowedOrigins.includes(origin);
    if (!allowed) console.warn(`[cors] rejected origin: ${origin}`);
    cb(null, { origin: allowed, credentials: true });
  })
);

// Render and most PaaS sit behind a proxy; trust it so req.ip + secure cookies work.
app.set('trust proxy', 1);
app.use(compression());
app.use(cookieParser());

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/payments/webhook')) return next();
  express.json({ limit: '1mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

app.use(mongoSanitize());
app.use(hpp());

if (env.nodeEnv !== 'test') app.use(morgan('dev'));
app.use(globalLimiter);

// Static uploads MUST be mounted before the API/notFound chain so the route resolves.
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    maxAge: '30d',
    fallthrough: false,
  })
);

app.use('/api', routes);

// Serve the built React PWA (single-service deploy: API + frontend on same origin).
// If client/dist was built during deploy, mount it; SPA routes fall back to index.html.
// Falls through to the API-only JSON banner when no build is present (dev mode).
if (hasClientBuild) {
  app.use(express.static(CLIENT_DIST, {
    maxAge: '30d',
    index: false, // we serve index.html via the SPA fallback below
    setHeaders: (res, filePath) => {
      // Service worker must always re-validate so updates roll out promptly.
      if (filePath.endsWith('sw.js') || filePath.endsWith('sw.mjs')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  // No frontend build present — keep the lightweight JSON banner for probes.
  app.get('/', (_req, res) => {
    res.json({
      service: 'kitchen-ecom-api',
      status: 'ok',
      docs: '/api/health',
      time: new Date().toISOString(),
    });
  });
  app.head('/', (_req, res) => res.sendStatus(200));
}

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

async function start() {
  await connectDB();

  if (String(process.env.AUTO_SEED || 'true').toLowerCase() !== 'false') {
    try {
      await runSeed();
    } catch (err) {
      console.error('[seed] auto-seed failed (continuing startup):', err.message);
    }
  }

  server.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[server] uploads -> ${UPLOADS_DIR}`);
    console.log(`[server] public url -> ${env.publicUrl || '(same-origin)'}`);
    if (hasClientBuild) {
      console.log(`[server] frontend -> serving ${CLIENT_DIST}`);
    } else {
      console.warn(`[server] frontend -> API only (no client/dist found). Tried:`);
      CLIENT_DIST_CANDIDATES.forEach((p) => console.warn(`           ${p}`));
      console.warn(`[server] Run "npm run build" so /assets requests can be served.`);
    }
    console.log(`[server] allowed origins -> ${env.allowedOrigins.join(', ')}`);
    const paystackStatus = env.paystack.enabled ? env.paystack.mode : 'stub';
    console.log(`[server] arkesel: ${env.arkesel.enabled ? 'live' : 'stub'} | paystack: ${paystackStatus}`);
    console.log(`[server] media origins (csp img-src + connect-src) -> ${MEDIA_ORIGINS.join(', ')}`);
    if (env.cloudinary.enabled) {
      console.log(`[server] cloudinary: live (cloud "${env.cloudinary.cloudName}")`);
    } else {
      console.warn(
        `[server] cloudinary: DISABLED — CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET missing. ` +
          `New uploads will be written to local disk (${UPLOADS_DIR}) instead of the CDN.`
      );
      if (env.nodeEnv === 'production') {
        console.warn(`[server] cloudinary: set those three vars in the Render env group — ` +
          `local-disk uploads are lost whenever the instance is replaced.`);
      }
    }
  });
}

start().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

export { app, server };
