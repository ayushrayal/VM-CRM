import 'dotenv/config';
import dns from 'dns';

if (process.env.USE_CUSTOM_DNS === 'true' || (process.env.NODE_ENV !== 'production' && process.env.USE_CUSTOM_DNS !== 'false')) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {
    // Ignore DNS set errors if unsupported
  }
}

import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';

const startServer = async () => {
  try {
    console.log('🚀 Starting Vytalis Media CRM Backend Services...');

    // Initialize Database Connections
    await connectDB();
    await connectRedis();

    // Start HTTP Server
    app.listen(env.PORT, () => {
      console.log(`🌐 Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error(`❌ Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
