import { Redis } from 'ioredis';
import { env } from './env.js';

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 1000, 3000);
    return delay;
  }
});

redisClient.on('connect', () => {
  console.log('🔴 Redis client connected successfully');
});

redisClient.on('error', (err) => {
  console.warn(`⚠️ Redis error: ${err.message}`);
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn(`⚠️ Redis connection failed: ${error.message}. Rate limiting will fall back or log warnings.`);
  }
};
