/**
 * Defines Middleware functionality
 *
 * */
const { handleErrors } = require('./ErrorMiddleware');
const { authenticate } = require('./AuthentificationMiddleware');

module.exports.handleErrors = handleErrors;
module.exports.authenticate = authenticate;
