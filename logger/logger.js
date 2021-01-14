/*
 * author: Tim Weber
 * created on 02/21/2018
 *
 * Libary for logging
* */
const { Logger, transports } = require('winston');
const Q = require('q');
const { AppConfig } = require('../configs/global');

const tsFormat = () => (new Date()).toLocaleTimeString();

class AppLogger {
  constructor(label, level, file) {
    this.label = label;
    this.level = level;

    this.logger = new Logger({
      transports: [
        // new transports.Console({
        //   timestamp: tsFormat,
        //   json: true,
        //   level: 'error',
        //   handleExceptions: true,
        //   label: label
        // }),
        new transports.File({
          filename: file,
          timestamp: tsFormat,
          json: true,
          level: level,
          label: label
        }),
      ],
      exitOnError: false
    });
  }

  query(opts) {
    const deferred = Q.defer();
    this.logger.query(opts, (err, results) => {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(results);
      }
    });
    return deferred.promise;
  }
  queryByFilter(opts, filter) {
    // filter ['database']
    const deferred = Q.defer();

    if (typeof filter === 'undefined') {
      deferred.reject(new Error('Expected parameter: filter'));
    } else {
      this.logger.query(opts, (err, results) => {
        if (err) {
          deferred.reject(err);
        } else {
          // result = { file: [{ level: '', message: '', label: '' }] }
          const filtered = results.file.filter(o => o.label === this.label && o[filter] === filter);
          deferred.resolve(filtered);
        }
      });
    }
    return deferred.promise;
  }
}

module.exports.AppLoggers = {
  BackupService: new AppLogger('BackupService', 'info', AppConfig.backupLogPath),
  RecoveryService: new AppLogger('RecoveryService', 'info', AppConfig.recoveryLogPath),
};
