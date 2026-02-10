const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const artistRoutes = require('./routes/artistRoutes');
const projectRoutes = require('./routes/projectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/artists', artistRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Pryntis Panel API is running' });
});

// Error handling
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Pryntis Panel API running on port ${config.port} [${config.nodeEnv}]`);
});

module.exports = app;
