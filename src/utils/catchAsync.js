/**
 * Higher-order function that wraps async controllers
 * Automatically catches any rejected Promise and passes the error to next()
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // 🚀 Automatically catches errors and calls next(err)!
    // fn(req, res, next).catch(err => next(err));
  };
};
