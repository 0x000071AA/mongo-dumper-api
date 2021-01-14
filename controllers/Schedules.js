const Schedules = require('../services/SchedulesService');

module.exports.createSchedule = function createSchedule (req, res, next) {
  Schedules.createSchedule(req.swagger.params, res, next);
};

module.exports.deleteSchedule = function deleteSchedule (req, res, next) {
  Schedules.deleteSchedule(req.swagger.params, res, next);
};

module.exports.getSchedulesByLabel = function getSchedulesByLabel(req, res, next) {
  Schedules.getSchedulesByLabel(req.swagger.params, res, next);
};

module.exports.getSchedules = function getSchedules (req, res, next) {
  Schedules.getSchedules(req.swagger.params, res, next);
};

module.exports.updateSchedule = function updateSchedule (req, res, next) {
  Schedules.updateSchedule(req.swagger.params, res, next);
};
