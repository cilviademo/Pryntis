const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

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

const app = express();

// Global middleware
app.use(cors());
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Pryntis Panel API is running' });
});

// Error handling
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`Pryntis Panel API running on port ${config.port} [${config.nodeEnv}]`);
  });
}

module.exports = app;
