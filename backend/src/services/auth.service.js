import crypto from 'crypto';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { generateToken } from '../utils/jwt.js';
import { recordFailedLogin, resetFailedLogin } from '../middleware/rateLimit.middleware.js';

const MAX_ADMIN_LIMIT = 5;

const verifyAccessKey = (providedKey) => {
  const expectedKey = env.ADMIN_ACCESS_KEY;
  if (!providedKey || !expectedKey) return false;
  
  const providedBuffer = Buffer.from(providedKey);
  const expectedBuffer = Buffer.from(expectedKey);
  
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

export const checkAdminCountLimit = async () => {
  const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
  if (adminCount >= MAX_ADMIN_LIMIT) {
    throw new ApiError(
      403,
      `Maximum admin limit reached (${MAX_ADMIN_LIMIT}/${MAX_ADMIN_LIMIT}). Cannot create or promote more admin accounts.`
    );
  }
  return adminCount;
};

export const registerAdmin = async ({ name, email, password, accessKey }) => {
  if (!verifyAccessKey(accessKey)) {
    throw new ApiError(401, 'Invalid admin access key.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email already exists.');
  }

  await checkAdminCountLimit();

  const adminUser = await User.create({
    name,
    email,
    password,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    pendingExpiresAt: null
  });

  const userObject = adminUser.toObject();
  delete userObject.password;

  return userObject;
};

export const registerTeamMember = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'An account with this email already exists.');
  }

  // Set 48-hour expiration for pending team requests
  const pendingExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const teamUser = await User.create({
    name,
    email,
    password,
    role: ROLES.TEAM,
    status: USER_STATUS.PENDING,
    pendingExpiresAt
  });

  const userObject = teamUser.toObject();
  delete userObject.password;

  return userObject;
};

export const authenticateUser = async ({ email, password, ip }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    await recordFailedLogin(ip, email);
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (user.status === USER_STATUS.PENDING) {
    throw new ApiError(403, 'Your account is pending administrator approval.');
  }

  if (user.status === USER_STATUS.REJECTED) {
    throw new ApiError(403, 'Your account registration request was rejected.');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, 'Your account is currently inactive.');
  }

  await resetFailedLogin(ip, email);

  const token = generateToken({
    id: user._id,
    role: user.role
  });

  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    token
  };
};
