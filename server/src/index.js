const fs = require('fs');
const envPath = require('path').resolve(__dirname, '../../.env');
// Only load .env file in local dev; in production, env vars come from the platform
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./db/pool');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');
const candidateRoutes = require('./routes/candidates');
const pipelineRoutes = require('./routes/pipeline');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const emailIngestionRoutes = require('./routes/emailIngestion');

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:3000'),
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/email-ingestion', emailIngestionRoutes);

// Health check
const mongoose = require('mongoose');
app.get('/api/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbState[mongoose.connection.readyState] || 'unknown',
    mongoUri: process.env.MONGODB_URI ? 'set (' + process.env.MONGODB_URI.substring(0, 30) + '...)' : 'NOT SET - using fallback',
  });
});

// Serve React build in production
const clientBuildPath = path.join(__dirname, '../../client/build');
if (require('fs').existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';

async function start() {
  app.listen(PORT, HOST, () => {
    logger.info(`Server running on ${HOST}:${PORT}`);
  });
  await connectDB();
  
  // Auto-start email ingestion if configured
  const { startImapListener } = require('./services/emailIngestion');
  if (process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD) {
    try {
      startImapListener({});
      logger.info('✅ Email ingestion auto-started - monitoring inbox every 60 seconds');
    } catch (err) {
      logger.error('Failed to start email ingestion:', err.message);
    }
  } else {
    logger.info('Email ingestion not configured (IMAP settings missing)');
  }
}

start().catch(err => {
  logger.error('Failed to start server:', err);
});
