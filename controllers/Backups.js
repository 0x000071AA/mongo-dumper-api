const Backups = require('../services/BackupsService');

module.exports.deleteBackupJobs = function deleteBackupJobs (req, res, next) {
  Backups.deleteBackupJobs(req.swagger.params, res, next);
};

module.exports.getBackups = function getBackups (req, res, next) {
  Backups.getBackups(req.swagger.params, res, next);
};

module.exports.getBackupsFromDatabase = function getBackupsFromDatabase (req, res, next) {
  Backups.getBackupsFromDatabase(req.swagger.params, res, next);
};

module.exports.getDbBackupsFromFtp = function getDbBackupsFromFtp(req, res, next) {
  Backups.getDbBackupsFromFtp(req.swagger.params, res, next);
};

module.exports.getDatabaseLogs = function getDatabaseLogs (req, res, next) {
  Backups.getDatabaseLogs(req.swagger.params, res, next);
};

module.exports.scheduleBackup = function scheduleBackup (req, res, next) {
  Backups.scheduleBackup(req.swagger.params, res, next);
};
