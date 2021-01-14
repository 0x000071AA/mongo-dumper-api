/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 * TODO:
 * Rework of BackupService:
 * + export logs to file
 */
const path = require('path');
const Q = require('q');
const { Cache } = require('../helpers/Cache');
const fast_glob = require('fast-glob');
const { createError } = require('../helpers/utils');
const { AppLoggers } = require('../logger/logger');
const { AppConfig } = require('../configs/global');
const { PromiseFtp } = require('../helpers/PromiseFtp');
const { Paginator } = require('../helpers/Paginator');

const log = AppLoggers.BackupService;
const { backupBaseDir } = AppConfig;
const sections = Cache.getAllSections();
const ftp = new PromiseFtp();

exports.deleteBackupJobs = (args, res, next) => {
  /**
   * Stops and deletes scheduled backup jobs. Using required query parameter job_descriptor
   * to select the proper job
   *
   * parameters:
   * - query:
   *   job_descriptor String: Select job to delete <?job_descriptor=#123> (required)
   *
   *  returns Object ({ message: '', data: '' })
   * */
  const jobDescriptor = args.job_descriptor.value;

  Q.all([
    Cache.get(sections.scheduledJobs),
    Cache.get(sections.cronService)
  ])
    .spread((runningJobs, crons) => {
      const foundJob = runningJobs.find(o => o.descriptor === jobDescriptor);
      if (typeof foundJob === 'undefined') {
        throw createError(`Job not found: ${jobDescriptor}`, 404);
      }
      const deleted = runningJobs.splice(runningJobs.indexOf(foundJob), 1);
      if (deleted && deleted.length === 0) {
        throw createError(`Could not delete job: ${jobDescriptor}`, 500);
      }
      crons.getJobs(deleted[0].scheduler).stop();

      res.status(200);
      res.json({ message: `Deleted: ${jobDescriptor}`, data: deleted });
    })
    .catch(err => next(err));
};

exports.getBackups = (args, res, next) => {
  /**
   * Retrieve all backups for all mongo databases for the predefined folder
   * structure: /{configurable_basepath}/dumps/db1/* [db2/*, db3/* ...].
   *
   * parameters:
   * - in query:
   *   backup_jobs Boolean:     Set to true, to list all current backup jobs (default false)
   *   limit       Number:      Limit Items per Page
   *   page        Number:      Page number
   *
   * returns Dataresponse ({ message: 'OK', data: []})
   * */
  const backupJobs = args.backup_jobs.value;
  const limit = args.limit.value;
  const page = args.page.value;
  // eventuelle lokale Ordnerstruktur: {configurable_basepath}/dumps/db1/* [db2/*, db3/* ...]
  //  packages: fast-glob
  //  need for glob: Scan directory recursively, filter files by folder name, [check stat of file]
  if (backupJobs) {
    Cache.get(sections.scheduledJobs)
      .then((jobs) => {
        if (jobs && jobs.length === 0) {
          throw createError('No backup jobs found', 404);
        }
        res.status(200);
        res.json({ message: 'Retrieved backup jobs', data: jobs });
      })
      .catch(err => next(err));
  } else {
    fast_glob(path.join(backupBaseDir, 'dumps', '**', '*'))
      .then((files) => {
        if (files && files.length === 0) {
          throw createError('No backups found', 404);
        }
        if (limit && page) {
          const _paginator = Paginator(files)(limit, page);
          res.status(200);
          res.json({ message: `Retrieved backup archives - page: ${page}`, data: [_paginator] });
        } else {
          res.status(200);
          res.json({ message: 'Retrieved backup archives', data: files });
        }
      })
      .catch(err => next(err));
  }
};

exports.getBackupsFromDatabase = (args, res, next) => {
  /**
   * Get backups for selected database in path.
   *
   * parameters:
   * - path:
   *   db       String:       Database descriptor for s MongoDB
   *   limit    Number:       Limit Items per Page
   *   page     Number:       Page number
   *
   * returns Dataresponse ({ message: 'OK', data: []})
   * */
  const db = args.db.value;
  const limit = args.limit.value;
  const page = args.page.value;

  fast_glob(path.join(backupBaseDir, 'dumps', db, '**', '*.gz'))
    .then((files) => {
      if (files && files.length === 0) {
        throw createError('No backups found', 404);
      }
      if (limit && page) {
        const _paginator = Paginator(files)(limit, page);
        res.status(200);
        res.json({ message: `Retrieved backup archives for ${db} - page: ${page}`, data: [_paginator] });
      } else {
        res.status(200);
        res.json({ message: `Retrieved backup archives for ${db}`, data: files });
      }
    })
    .catch(err => next(err));
};

exports.getDbBackupsFromFtp = (args, res, next) => {
  /**
   * Get backups for selected database in path.
   *
   * parameters:
   * - path:
   *   db String
   * - query:
   *   ftp_data String: ?ftp_data={host,port,username,password} < connection info for ftp >"
   *   ftp_base_path String: &ftp_base_path=/ < base path for ftp >
   *
   * returns Dataresponse ({ message: 'OK', data: []})
   * */
  const ftp_data = args.ftp_data.value;
  const basePath = args.ftp_base_path.value;
  const database = args.db.value;

  let ftpConnection;
  try {
    ftpConnection = JSON.parse(ftp_data);
  } catch (err) {
    next(createError(`Bad request: Invalid object ${ftp_data}`, 400));
    return;
  }
  const ftpPath = `${basePath}/${database}`;

  ftp.connect(ftpConnection)
    .then(() => ftp.list(ftpPath))
    .then((files) => {
      if (files && files.length === 0) {
        throw createError(`No backups found: ${ftpPath}`, 404);
      }
      res.status(200);
      res.json({ message: `Retrieved backup archives on ftp server: ${ftp_data.host}`, data: files });
    })
    .catch(err => next(err));
};


exports.getDatabaseLogs = (args, res, next) => {
  /**
   * Retrieve all backup log entries. Result can be filtered for
   * a selected database via an optional query parameter.
   *
   * parameter:
   * - query:
   *   db_descriptor String:  Name of a MongoDB <?db_id=dummyDB (optional)>
   *
   * returns Dataresponse ({ message: 'Backup logs', data: []})
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

exports.scheduleBackup = (args, res, next) => {
  /**
   * Create backup cron job and starts it. Using parameter delete_old=true, to create an automatic job to delete
   * old backups using a config file (e.g. only keep the 7 newest backups).
   * If an ftp-Server is configured and activated,
   * the backup will also be deleted on the ftp server
   *
   * parameters:
   * - body (backup)
   *   descriptor String: Task descriptor
   *   database String:   MongoDB descriptor
   *   scheduler String:  Schedule descriptor
   *
   * returns { message: 'OK', data: []}
   * */
  // job config object { descriptor: '', scheduler: '', database: '', command: '', started: ''}

  const backup = args.backup.value;
  const job = {
    descriptor: backup.descriptor,
    scheduler: backup.scheduler,
    database: backup.database,
    started: new Date()
  };

  const promises = [
    Cache.get(sections.databases),
    Cache.get(sections.scheduledJobs),
    Cache.get(sections.cronService)
  ];

  Q.all(promises)
    .spread((databases, jobs, crons) => {
      const dbFound = databases.find(o => o.name === backup.database);
      if (typeof dbFound === 'undefined') {
        throw createError(`Database not found: ${backup.database}`, 404);
      }
      const scheduledJob = jobs.find(o => o.descriptor === backup.descriptor);

      if (typeof scheduledJob !== 'undefined') {
        throw createError(`Job already exists: ${backup.descriptor}`, 409);
      }
      const foundCron = crons.getJobs(backup.scheduler);

      if (typeof foundCron === 'undefined') {
        throw createError(`Schedule not found: ${backup.scheduler}`);
      }
      const cronObj = foundCron.toJson();
      const started = crons.startJob(cronObj.descriptor);

      if (!started) {
        throw createError(`Could not started job: ${backup.descriptor}`, 500);
      }
      job.command = cronObj.command;

      jobs.push(job);
      res.status(201);
      res.json({ message: `Job started: ${backup.descriptor}`, data: [job] });
    })
    .catch(err => next(err));
};

