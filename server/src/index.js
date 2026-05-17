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
// client/dist sits at ../../client/dist relative to server/src/
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
const hasClientBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / non-browser requests (no Origin header)
      if (!origin) return cb(null, true);
      if (env.allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
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
    console.log(`[server] frontend -> ${hasClientBuild ? `serving ${CLIENT_DIST}` : 'API only (no client/dist found)'}`);
    console.log(`[server] allowed origins -> ${env.allowedOrigins.join(', ')}`);
    console.log(`[server] arkesel: ${env.arkesel.enabled ? 'live' : 'stub'} | paystack: ${env.paystack.enabled ? 'live' : 'stub'}`);
  });
}

start().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

export { app, server };
