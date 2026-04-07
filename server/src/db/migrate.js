const logger = require('../utils/logger');

async function migrate() {
  logger.info('MongoDB uses Mongoose schemas - no explicit migration needed.');
  logger.info('Indexes are created automatically when models are loaded.');
  logger.info('Run "npm run seed" to populate sample data.');
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env.example') });
  const { connectDB } = require('./pool');
  connectDB().then(() => migrate()).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrate };
