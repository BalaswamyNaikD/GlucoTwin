const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const bookingRoutes = require('./routes/bookingRoutes');
const { corsOrigin, nodeEnv } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});
app.use('/api', limiter);

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'appointment-service', status: 'healthy' });
});

app.use('/api', bookingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
