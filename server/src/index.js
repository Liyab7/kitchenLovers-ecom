import http from 'http';
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
    console.log(`[server] allowed origins -> ${env.allowedOrigins.join(', ')}`);
    console.log(`[server] arkesel: ${env.arkesel.enabled ? 'live' : 'stub'} | paystack: ${env.paystack.enabled ? 'live' : 'stub'}`);
  });
}

start().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

export { app, server };
