import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { USER_STATUS } from '../constants/status.js';

export const authGuard = async (req, res, next) => {
  // Always permit unauthenticated OPTIONS preflight requests to succeed
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Authentication required. No token provided.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired token. Please sign in again.');
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError(401, 'User account no longer exists.');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(403, 'Your account is not active. Access denied.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
