const Authentifications = require('../services/AuthentificationsService');

module.exports.authUser = function authUser (req, res, next) {
  Authentifications.authUser(req.swagger.params, res, next);
};
