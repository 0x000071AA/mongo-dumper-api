const Databases = require('../services/DatabasesService');

module.exports.getDatabases = function getDatabases (req, res, next) {
  Databases.getDatabases(req.swagger.params, res, next);
};
