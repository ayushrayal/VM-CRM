import { ApiError } from '../utils/ApiError.js';

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required. No user context found.'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new ApiError(
        403,
        `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`
      )
    );
  }

  next();
};
