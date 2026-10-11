/**
 * Functional AppError Factory Function
 * Modern industry pattern without using class/this/new
 */
export const createAppError = (message, statusCode = 500) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  error.isOperational = true; // Marks expected operational errors (404, 400, etc.)

  // Retain clean stack trace excluding this factory function call
  Error.captureStackTrace(error, createAppError);

  return error;
};

