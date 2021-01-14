/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 */
const Configuration = require('../services/ConfigurationService');

module.exports.configure = function configure (req, res, next) {
  Configuration.configure(req.swagger.params, res, next);
};

module.exports.getConfig = function getConfig (req, res, next) {
  Configuration.getConfig(req.swagger.params, res, next);
};
