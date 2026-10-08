const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  port: Number(process.env.PORT || 5001),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_hospital',
  corsOrigin: process.env.CORS_ORIGIN || 'http://127.0.0.1:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};
