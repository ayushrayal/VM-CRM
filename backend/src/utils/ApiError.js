export class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '', errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.errorCode = errorCode;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
