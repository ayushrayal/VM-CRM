import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const formattedErrors = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message
    }));
    error = new ApiError(400, 'Validation failed', formattedErrors);
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack, error.errorCode || error.code || null);
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
    ...(error.errorCode ? { errorCode: error.errorCode } : {}),
    errors: error.errors || []
  };

  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  if (error.statusCode >= 400) {
    try {
      import('fs').then((fs) => {
        fs.appendFileSync(
          'validation-debug.log',
          `[${new Date().toISOString()}] HTTP ${error.statusCode} ${error.message} - Errors: ${JSON.stringify(error.errors || [])}\n`
        );
      });
    } catch {}
  }

  return res.status(error.statusCode || 500).json(response);
};
