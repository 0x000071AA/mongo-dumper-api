/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 */
const { createError, isEmtyObject, commandStringify } = require('../helpers/utils');
const { shellExec } = require('../helpers/promisfy');
const { AppConfig } = require('../configs/global');
const { PromiseFtp } = require('../helpers/PromiseFtp');
const path = require('path');
const Q = require('q');
const { AppLoggers } = require('../logger/logger');
const { Cache } = require('../helpers/Cache');

const ftp = new PromiseFtp();
const log = AppLoggers.RecoveryService;
const sections = Cache.getAllSections();
const { backupTmp } = AppConfig;

exports.getRecoveryLogs = (args, res, next) => {
  /**
   * Retrieve Logs for recoveries. Result can be filtered.
   * Supported log filters: 'database'
   *
   * parameters:
   * - query
   *   db_descriptor String:  Filter for databases <?db_descriptor=dummyDB (optional)>
   *
   * returns Dataresponse ({ message: '', data: '' })
   * */
  const db_descriptor = args.db_descriptor.value;
  const limit = args.limit.value;
  const offset = args.offset.value;

  // Find items logged between today and yesterday.
  const queryOptions = {
    // from: new Date() - (24 * 60 * 60 * 1000),
    until: new Date(),
    limit: limit || 10,
    start: offset || 0,
    order: 'desc',
  };

  if (typeof db_descriptor === 'undefined') {
    log.query(queryOptions)
      .then((logs) => {
        if (!logs.file && logs.file.length === 0) {
          throw createError('No logs found', 404);
        }
        res.status(200).json({ message: 'Log entries', offset: offset, data: logs.file });
      })
      .catch(err => next(err));
  } else {
    log.queryByFilter(queryOptions, 'database')
      .then((logs) => {
        if (!logs && logs.length === 0) {
          throw createError('No logs found', 404);
        }
        res.status(200).json({ message: 'Log entries', offset: offset, data: logs });
      })
      .catch(err => next(err));
  }
};

exports.runRecovery = (args, res, next) => {
  /**
   * Start recovery process (post)
   *
   * parameters:
   * - body (recovery):
   *   database String:           MongoDB descriptor
   *   recovery_command String:   command descriptor
   *   archive String:            local archive
   *   ftp Object:               configuration for an ftp server {user: '', host: '', password: '', basePath: ''}
   *
   *   returns { message: 'Started job', data: []}
   * */
  const recovery = args.recovery.value;

  Cache.get(sections.commands)
    .then((commands) => {
      const promises = [];
      let job;
      const cmd = commands.find(o => o.descriptor === recovery.recovery_command);
      if (typeof cmd === 'undefined') {
        throw createError(`Recovery command not found: ${recovery.recovery_command}`, 404);
      }
      // if ftp is not defined, use local archive otherwise download archive from ftp
      if (isEmtyObject(recovery.ftp)) {
        job = commandStringify(cmd.command, cmd.parameters, recovery.archive);
        promises.push(shellExec(job));
      } else {
        const connection = Object.keys(recovery.ftp)
          .filter(key => key !== 'basePath')
          .reduce((obj, item) => {
            obj[item] = recovery.ftp[item];
            return obj;
          }, {});
        promises.push(ftp.connect(connection));

        const localFile = path.join(backupTmp, path.basename(recovery.archive));
        promises.push(ftp.get(recovery.archive, localFile));
        promises.push(ftp.end());

        job = commandStringify(cmd.command, cmd.parameters, localFile);
        promises.push(shellExec(job));
      }
      return Q.all(promises);
    })
    .then((results) => {
      let json;
      if (results && results.length === 1) {
        [json] = results;
      } else {
        json = results.filter(o => o !== undefined).find(o => Object.prototype.hasOwnProperty.call(o, 'out'));
      }

      log.logger.info(json.out, {
        database: recovery.database,
        recoveryCommand: recovery.recovery_command,
        archive: recovery.archive,
        ftp: recovery.ftp,
      });

      res.status(201);
      res.json({ message: 'Recovery finished', data: json.out });
    })
    .catch(err => next(err));
};

