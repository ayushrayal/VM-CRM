import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .or(z.number())
    .default('5000')
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10))),
  MONGO_URI: z
    .string()
    .or(z.undefined())
    .transform(() => process.env.MONGO_URI || process.env.MONGODB_URI || '')
    .pipe(z.string().min(1, 'MONGO_URI or MONGODB_URI is required and cannot be empty')),
  CLIENT_URL: z
    .string()
    .optional()
    .default(''),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET is required' })
    .min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  ADMIN_ACCESS_KEY: z
    .string()
    .or(z.undefined())
    .transform(() => process.env.ADMIN_ACCESS_KEY || process.env.ACCESS_KEY || '')
    .pipe(z.string().min(8, 'ADMIN_ACCESS_KEY or ACCESS_KEY must be at least 8 characters')),
  REDIS_URL: z.string().optional().default('redis://127.0.0.1:6379'),
  USE_CUSTOM_DNS: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional().default(''),
  IMAGEKIT_PRIVATE_KEY: z.string().optional().default(''),
  IMAGEKIT_URL_ENDPOINT: z.string().optional().default('')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('\n❌ CRITICAL: Missing or invalid required environment variables:');
  const formattedErrors = _env.error.format();
  for (const [key, value] of Object.entries(formattedErrors)) {
    if (key !== '_errors' && value?._errors?.length) {
      console.error(`   • ${key}: ${value._errors.join(', ')}`);
    }
  }
  console.error('Please configure these variables in your .env or Render Dashboard.\n');
  throw new Error('Server halted due to invalid or missing required environment variables.');
}

export const env = _env.data;
