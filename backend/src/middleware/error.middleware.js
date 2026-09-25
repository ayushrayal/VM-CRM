import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = new ApiError(400, `An account with this ${field} already exists.`, [
      { field, message: `${field} must be unique.` }
    ]);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || []
  };

  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return res.status(error.statusCode || 500).json(response);
};
