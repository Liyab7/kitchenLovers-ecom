import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(err, req, res, _next) {
  let error = err;
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Server error';

    if (error.name === 'ValidationError') {
      statusCode = 400;
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid ${error.path}: ${error.value}`;
    } else if (error.code === 11000) {
      // Mongo duplicate-key error
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0];
      const value = field ? error.keyValue[field] : '';
      message = field
        ? `${field} "${value}" already exists. Try a different ${field}.`
        : 'Duplicate value — record already exists.';
    }

    error = new ApiError(statusCode, message, error.details);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[error]', err);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  });
}
