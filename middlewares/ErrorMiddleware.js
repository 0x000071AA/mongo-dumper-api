/**
 * Error Middleware
 *
 * */
const swaggerErrorTypes = ['INVALID_TYPE', 'SCHEMA_VALIDATION_FAILED', 'REQUIRED'];
const errorNames = ['ValidationError', 'SyntaxError'];

module.exports.handleErrors = (err, req, res, next) => {
  if (!err) {
    return;
  }
  if ((err.code && swaggerErrorTypes.includes(err.code)) || (err.name && errorNames.includes(err.name))) {
    err.status = 400;
    // swagger_error = true;
  }
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err.status || 500,
  });
};
