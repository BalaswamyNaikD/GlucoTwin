const app = require('./app');
const { connectDatabase } = require('./config/db');
const { mongodbUri, port } = require('./config/env');

async function bootstrap() {
  try {
    const connected = await connectDatabase(mongodbUri);
    if (!connected) {
      process.env.APPOINTMENT_STORE = 'local';
      // eslint-disable-next-line no-console
      console.warn('MongoDB unavailable. Running appointment service in local JSON mode (low CPU).');
    }
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Appointment service running on http://127.0.0.1:${port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start appointment service', error);
    process.exit(1);
  }
}

bootstrap();
