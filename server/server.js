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

const app = express();

// ── CORS Lockdown ───────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://pryntis-panel.onrender.com',
];
const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// ── Helmet — secure HTTP headers ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── Compression ─────────────────────────────────────────────────
app.use(compression());

// ── Global API rate limiter ──────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down' },
  },
});
app.use('/api/', apiLimiter);

// ── Global middleware ───────────────────────────────────────────
app.use(responseTime);
app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api/v1/auth', authRoutes);
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
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/pdf', pdfRoutes);
app.use('/api/v1/admin', impersonateRoutes);

// Health check — verifies DB connectivity
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() AS time');
    res.json({ success: true, message: 'Pryntis Panel API is running', db: rows[0].time });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database unreachable', error: err.message });
  }
});

// In production, serve the built React client
if (config.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Increase body size limit for file uploads (multipart handled by multer separately)
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

    function shutdown(signal) {
      console.log(`\n${signal} received — shutting down gracefully`);
      server.close(() => {
        db.pool.end().then(() => {
          console.log('DB pool drained. Goodbye.');
          process.exit(0);
        });
      });
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }).catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

module.exports = app;
