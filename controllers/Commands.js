const Commands = require('../services/CommandsService');

module.exports.createMongoDbCommand = function createMongoDbCommand (req, res, next) {
  Commands.createMongoDbCommand(req.swagger.params, res, next);
};

module.exports.deleteCommandConfig = function deleteCommandConfig (req, res, next) {
  Commands.deleteCommandConfig(req.swagger.params, res, next);
};

module.exports.updateMongoDbCommand = function updateMongoDbCommand (req, res, next) {
  Commands.updateMongoDbCommand(req.swagger.params, res, next);
};

module.exports.getMongoDbCommandsByType = function getMongoDbCommandsByType (req, res, next) {
  Commands.getMongoDbCommandsByType(req.swagger.params, res, next);
};

module.exports.getMongoDbCommands = function getMongoDbCommands (req, res, next) {
  Commands.getMongoDbCommands(req.swagger.params, res, next);
};
