import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redisClient } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

// Setup Redis rate limiters with fallback to memory limiter if Redis fails
let loginBruteLimiter;
let signupLimiter;

const maxLoginAttempts = 5;
const lockDurationSeconds = 15 * 60; // 15 minutes

const initLimiters = () => {
  const storeClient = redisClient.status === 'ready' || redisClient.status === 'connecting'
    ? redisClient
    : null;

  if (storeClient) {
    loginBruteLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_login_fail',
      points: maxLoginAttempts,
      duration: lockDurationSeconds,
      blockDuration: lockDurationSeconds
    });

    signupLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_signup',
      points: 10,
      duration: 60 * 15 // 10 signups per 15 minutes per IP
    });
  } else {
    loginBruteLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_login_fail',
      points: maxLoginAttempts,
      duration: lockDurationSeconds,
      blockDuration: lockDurationSeconds
    });

    signupLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_signup',
      points: 10,
      duration: 60 * 15
    });
  }
};

initLimiters();

export const checkLoginBruteForce = async (req, res, next) => {
  try {
    const key = `${req.ip}_${req.body.email || ''}`;
    const resLimiter = await loginBruteLimiter.get(key);

    if (resLimiter && resLimiter.consumedPoints >= maxLoginAttempts) {
      const retrySecs = Math.round(resLimiter.msBeforeNext / 1000) || lockDurationSeconds;
      throw new ApiError(
        429,
        `Too many failed login attempts. Your account login is locked for ${Math.ceil(
          retrySecs / 60
        )} minutes.`
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const recordFailedLogin = async (ip, email) => {
  try {
    const key = `${ip}_${email}`;
    await loginBruteLimiter.consume(key);
  } catch (err) {
    // Expected when points are exhausted
  }
};

export const resetFailedLogin = async (ip, email) => {
  try {
    const key = `${ip}_${email}`;
    await loginBruteLimiter.delete(key);
  } catch (err) {
    // Ignore error if key doesn't exist
  }
};

export const checkSignupRateLimit = async (req, res, next) => {
  try {
    await signupLimiter.consume(req.ip);
    next();
  } catch (error) {
    next(new ApiError(429, 'Too many signup requests from this IP. Please try again later.'));
  }
};
