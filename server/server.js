const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
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

// ── Global middleware ───────────────────────────────────────────
app.use(responseTime);
app.use(express.json());

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

if (process.env.NODE_ENV !== 'test') {
  initDb().then(() => {
    const server = app.listen(config.port, () => {
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
