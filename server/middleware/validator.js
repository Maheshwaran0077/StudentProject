const AppError = require('../utils/AppError');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return next(new AppError('Validation failed', 400, errors));
    }
    // Update req[property] with parsed data (handles default values, coercions, type casting)
    req[property] = result.data;
    next();
  };
};

module.exports = validate;
