/* eslint-disable consistent-return */
/**
 * Authentification middleware based on
 * json web tokens
 *
 * TODO:
 * - Rework of defining open routes (configuration)
 * */
const { Jwt } = require('../helpers/jwt');
const { createError } = require('../helpers/utils');

module.exports.authenticate = (req, res, next) => {
  // defines open api routes and checks wheter route is an
  // open route or not. If it is an open route, skip authentification
  const unAuth = [
    { path: '/users', methods: ['GET', 'POST'] },
    { path: '/auth', methods: ['GET'] }
  ];
  const { apiPath } = req.swagger;

  const pathFound = unAuth.find(o => o.path === apiPath);
  if (typeof pathFound !== 'undefined') {
    if (pathFound.methods.indexOf(req.method) !== -1) {
      next();
      return null;
    }
    next();
    return null;
  }
  const x_access_token = req.headers['x-access-token'] || req.query['x-access-token'] || '';

  Jwt.verify(x_access_token)
    .then((decoded) => {
      req.swagger.params.auth_user = decoded;
      next();
      return null;
    })
    .catch((err) => {
      const errMessage = err.message || { message: 'API -  Unauthorized token' };
      next(createError(errMessage, 401));
      return null;
    });
};
