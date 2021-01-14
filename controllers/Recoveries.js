const Recoveries = require('../services/RecoveriesService');

module.exports.getRecoveryLogs = function getRecoveryLogs (req, res, next) {
  Recoveries.getRecoveryLogs(req.swagger.params, res, next);
};

module.exports.runRecovery = function runRecovery (req, res, next) {
  Recoveries.runRecovery(req.swagger.params, res, next);
};
