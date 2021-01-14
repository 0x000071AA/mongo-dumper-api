const Users = require('../services/UsersService');

module.exports.createUser = function createUser (req, res, next) {
  Users.createUser(req.swagger.params, res, next);
};

module.exports.deleteUser = function deleteUser (req, res, next) {
  Users.deleteUser(req.swagger.params, res, next);
};

module.exports.getUsers = function getUsers (req, res, next) {
  Users.getUsers(req.swagger.params, res, next);
};
