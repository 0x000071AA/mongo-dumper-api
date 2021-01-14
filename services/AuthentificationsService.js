/* eslint-disable no-unused-vars */
/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 */
const { Jwt } = require('../helpers/jwt');
const { createError } = require('../helpers/utils');

exports.authUser = (args, res, next) => {
  /**
   * Authenticate user
   *
   * parameters:
   * - query:
   *   token String:  json web token
   *
   * */
  const token = args.token.value;

  if (!token) {
    next(createError('Bad request: Provide a token', 400));
    return;
  }
  Jwt.verify(token)
    .then((verified) => {
      res.status(200);
      res.json([{ message: 'Verified', token: verified.token, expiresIn: verified.exp }]);
    })
    .catch(err => next(err));
};

