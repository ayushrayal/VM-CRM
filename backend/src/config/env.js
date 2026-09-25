import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGO_URI: z.string({ required_error: 'MONGO_URI is required' }),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  ADMIN_ACCESS_KEY: z.string().min(8, 'ADMIN_ACCESS_KEY must be at least 8 characters'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables configuration.');
}

export const env = _env.data;
