const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./config/db');
const initDb = require('./initDb');
const { errorHandler } = require('./middleware/errorHandler');
const { responseTime } = require('./middleware/responseTime');
const { securityHeaders } = require('./middleware/securityHeaders');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const artistRoutes = require('./routes/artistRoutes');
const projectRoutes = require('./routes/projectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const passRoutes = require('./routes/passRoutes');
const portRoutes = require('./routes/portRoutes');
const taskRoutes = require('./routes/taskRoutes');
const kpiRoutes = require('./routes/kpiRoutes');
const contactRoutes = require('./routes/contactRoutes');
const templateRoutes = require('./routes/templateRoutes');
const activityRoutes = require('./routes/activityRoutes');
const panelRoutes = require('./routes/panelRoutes');
const portAnalyticsRoutes = require('./routes/portAnalyticsRoutes');
const businessRoutes = require('./routes/businessRoutes');
const searchRoutes = require('./routes/searchRoutes');
const exportRoutes = require('./routes/exportRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const impersonateRoutes = require('./routes/impersonateRoutes');
const auditRoutes = require('./routes/auditRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');

const app = express();

const isProd = config.nodeEnv === 'production';

// CORS Lockdown
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultOrigins = isProd
  ? ['https://pryntis-panel.onrender.com']
  : ['http://localhost:3000', 'http://localhost:5000', 'https://pryntis-panel.onrender.com'];
const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Helmet — secure HTTP headers with CSP
const frameSources = ["'self'"];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:', ...origins],
      fontSrc: ["'self'", 'data:'],
      frameSrc: frameSources,
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// Additional security headers
app.use(securityHeaders);

// Compression
app.use(compression());

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' },
  },
});
app.use('/api/', apiLimiter);

// Stricter limit for auth endpoints (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts' },
  },
});

// Stricter limit for file upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Upload limit reached, try again later' },
  },
});

// Global middleware
app.use(responseTime);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// API routes (auth limiter applied to auth routes specifically)
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/artists', artistRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/pass', passRoutes);
app.use('/api/v1/port', portRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/kpi', kpiRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/panel', panelRoutes);
app.use('/api/v1/port/analytics', portAnalyticsRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/media', uploadLimiter, mediaRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/pdf', pdfRoutes);
app.use('/api/v1/admin', impersonateRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/ledger', ledgerRoutes);

// Health check — safe: never expose DB internals or error messages
app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (_err) {
    res.status(503).json({ status: 'degraded' });
  }
});

// In production, serve the built React client
if (isProd) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  initDb().then(() => {
    const http = require('http');
    const httpServer = http.createServer(app);

    // Initialize WebSocket (socket.io) for real-time presence
    try {
      const { Server } = require('socket.io');
      const { initPresence } = require('./realtime/presenceManager');
      const io = new Server(httpServer, {
        cors: { origin: origins, credentials: true },
        transports: ['websocket', 'polling'],
      });
      initPresence(io);
      console.log('[WS] WebSocket server initialized');
    } catch (err) {
      console.warn('[WS] WebSocket initialization skipped:', err.message);
    }

    const server = httpServer.listen(config.port, () => {
      console.log(`Pryntis Panel API running on port ${config.port} [${config.nodeEnv}]`);
    });

    // Graceful shutdown
    const SHUTDOWN_TIMEOUT = 10000;
    function shutdown(signal) {
      console.log(`\n${signal} received — shutting down gracefully`);
      server.close(() => {
        db.pool.end().then(() => {
          console.log('DB pool drained. Goodbye.');
          process.exit(0);
        });
      });
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT);
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }).catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });
}

module.exports = app;
