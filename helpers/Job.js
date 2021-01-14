/**
 * author: Tim Weber
 * created on 02/20/2018
 *
 * */
const { CronJob } = require('cron');
const { shellExec, mkdirp } = require('../helpers/promisfy');
const { commandStringify, createError, strInject } = require('../helpers/utils');
const fast_glob = require('fast-glob');
const { PromiseFtp } = require('../helpers/PromiseFtp');
const path = require('path');
const { AppConfig } = require('../configs/global');
const { sha256 } = require('../helpers/utils');

const { backupBaseDir } = AppConfig;
const fs = require('fs');
const Q = require('q');

const ftp = new PromiseFtp();


class Job {
  constructor(options) {
    /**
     * Constructor
     *
     * param command Object:   Command object with config
     * param action String:    Defines which job callback will be used
     * param options Object:   Settings for Cron
     *                         {label: '', descriptor:' ', cronTime:'', timeZone:'', useFtp: '', ftp: {},
     *                         action: '', logger: '', command: {} }
     * */
    this.isSuspended = options.isSuspended === undefined ? true : options.isSuspended;
    this.label = options.label;
    this.descriptor = options.descriptor;
    this.id = options.id || sha256(this.descriptor);
    this.command = options.command;
    this.log = options.logger;
    this.useFtp = options.use_Ftp;
    this.ftp = options.ftp;
    this.action = options.action;
    this._loggoerTemplate = {
      database: this.command.parameters.db,
      backupCommand: this.command.descriptor,
      archive: this.command.parameters.archive || undefined,
      ftp: options.ftp,
    };

    if (this.action === 'backup') {
      this._callback = () => {
        const parameters = Object.assign({}, this.command.parameters);

        const cmd = commandStringify(this.command.command, parameters);
        // first create directories if necessarry
        const dirs = path.dirname(this.command.parameters.archive);
        mkdirp(dirs)
          .then(() => shellExec(cmd))
          .then((json) => {
            this.log.logger.info(json.out, this._loggoerTemplate);
            if (!this.useFtp) {
              return;
            }
            const ftpBasepath = options.ftp.basePath === '/' ? '' : options.ftp.basePath;
            ftp.connect(options.ftp)
              .then(() => ftp.mkdirp(`${ftpBasepath}/dumps/${parameters.db}`))
              .then(() => {
                const archive = strInject(parameters.archive);
                const database = parameters.db;
                const ftpArchive = `${ftpBasepath}/dumps/${database}/${path.basename(archive)}`;
                return ftp.put(archive, ftpArchive);
              })
              .then((file) => {
                this.log.logger.info(file, this._loggoerTemplate);
                return ftp.end();
              })
              .catch((err) => {
                this.log.logger.error(err.message, this._loggoerTemplate);
                ftp.end();
                throw err;
              });
          })
          .catch((err) => {
            this.log.logger.error(err.message, this._loggoerTemplate);
          });
      };
    } else if (this.action === 'delete') {
      this._callback = () => {
        // create a readable stream that returns file objects with stats.
        // Files will be filtered by defined delete pattern and will be removed from
        // the file system and from the ftp server
        const { db } = this.command.parameters;
        const stream = fast_glob.stream(path.join(backupBaseDir, 'dumps', db, '**', '*'), { stats: true });
        const filesToDeleteFtp = [];
        const errors = [];
        const MatchDeletion = {};
        MatchDeletion['>='] = (ctime, cuDate) => ctime.getDate() <= cuDate.getDate();
        MatchDeletion['>'] = (ctime, cuDate) => ctime.getDate() < cuDate.getDate();

        stream.on('data', (fileObj) => {
          const { pattern } = this.command.parameters;
          if (pattern === undefined) {
            return;
          }
          const cTime = new Date(fileObj.ctime);
          const cuDate = new Date();

          // regex: matches >,>= and numbers of cleanup pattern
          const matched = pattern.match(/(>=|[>])\s*(\d+)/);

          cuDate.setDate(cuDate.getDate() - parseInt(matched[2], 10));
          const deleted = MatchDeletion[matched[1]](cTime, cuDate);
          if (deleted) {
            filesToDeleteFtp.push(fileObj.path);
            fs.unlink(fileObj.path, (err) => {
              if (err) {
                errors.push(createError(err));
              }
              console.log(`Deleted file: ${fileObj.path}`);
            });
          }
        });
        stream.once('error', (err) => {
          this.log.logger.error(err, this._loggoerTemplate);
        });

        stream.once('end', () => {
          if (errors.length !== 0) {
            stream.emit('error', errors);
          }

          if (!this.useFtp || filesToDeleteFtp.length === 0) {
            this.log.logger.info([], this._loggoerTemplate);
            return;
          }
          ftp.connect(options.ftp)
            .then(() => {
              const database = this.command.parameters.db;
              const basePath = options.ftp.basePath === '/' ? '' : options.ftp.basePath;

              return Q.allSettled(filesToDeleteFtp.map((item) => {
                const ftpArchive = `${basePath}/dumps/${database}/${path.basename(item)}`;
                return ftp.delete(ftpArchive);
              }));
            })
            .then((results) => {
              const failed = [];
              const files = [];
              results.forEach((result) => {
                if (result.state === 'fulfilled') {
                  files.push(result.value);
                  return;
                }
                failed.push(result.reason);
              });
              this.log.logger.info(files, this._loggoerTemplate);
              if (failed.length !== 0) {
                this.log.logger.error(failed, this._loggoerTemplate);
              }
              return ftp.end();
            })
            .catch((err) => {
              stream.emit('error', createError(err));
              ftp.end();
            });
        });
      };
    }

    if (this._callback === undefined) {
      this.error = new Error(`Error: ${this.action} is not a valid action`);
      return;
    }

    try {
      this._job = new CronJob({
        start: false,
        cronTime: options.options.cronTime,
        timeZone: options.options.timeZone,
        onTick: this._callback
      });
    } catch (ex) {
      this.error = createError(`Invalid cron pattern: ${options.options.cronTime}`, 409);
    }
  }
  execute() {
    if (this.error === undefined) {
      this._job.start();
      this.isSuspended = false;
      return true;
    }
    return false;
  }
  suspend() { this.isSuspended = true; }
  stop() {
    if (this.error === undefined && this._job.running) {
      this._job.stop();
    }
  }
  isRunning() {
    return !!(typeof this._job !== 'undefined' && this._job.running);
  }
  toJson() {
    return {
      descriptor: this.descriptor,
      label: this.label,
      useFtp: this.useFtp,
      ftp: this.ftp,
      options: {
        cronTime: this._job.cronTime.source,
        timeZone: this._job.cronTime.zone
      },
      command: this.command,
      action: this.action,
      isSuspended: this.isSuspended
    };
  }
}

module.exports.Job = Job;
