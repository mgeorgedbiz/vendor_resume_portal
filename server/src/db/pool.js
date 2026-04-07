const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/resume_vendor';

logger.info('MONGODB_URI starts with: ' + MONGODB_URI.substring(0, 40) + '...');

async function connectDB(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      logger.info('MongoDB connected successfully');
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) {
        const wait = Math.min(i * 3000, 15000);
        logger.info(`Retrying in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  logger.error('All MongoDB connection attempts failed');
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = { connectDB };
