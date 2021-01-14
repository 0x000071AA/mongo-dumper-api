/* eslint-disable no-unused-vars */
/*
 * author: Tim Weber
 * created on 02/21/2018
 *
 * Libary for cron job
 *
 * TODO:
 * init existing cron jobs
* */
const { Job } = require('../helpers/Job');
const { createError } = require('../helpers/utils');
const AppLogger = require('../logger/logger').AppLoggers;

const log = AppLogger.BackupService;

class CronService {
  constructor(config) {
    /**
     * param config Object:    job configuration
     *                         { label: '', descriptor: '', command: {},
     *                           action: '', useFtp: '', ftp: {}, opts: {} }
     * */
    this._crons = {};
    if (config !== undefined) {
      Object.keys(config).forEach((id) => {
        config[id].logger = log;
        const job = new Job(config[id]);
        if (job.error) {
          console.log(new Error(`Could not load job with id: ${id}`));
          return;
        }
        this._crons[id] = job;
        if (!job.isSuspended) job.execute();
      });
    }
  }
  initCronService(_id, config) {
    if (this._crons[_id]) {
      return createError(`Schedule already exists: ${_id}`, 409);
    }
    config.logger = log;
    const job = new Job(config);
    if (job.error) {
      return job.error;
    }
    this._crons[_id] = job;
    return true;
  }

  getCrons() {
    return Object.keys(this._crons).reduce((obj, cur) => ({ ...obj, [cur]: this._crons[cur].toJson() }), {});
  }

  getJobs(_id) {
    if (_id === undefined) {
      const jobs = [];
      Object.keys(this._crons).forEach((key) => {
        if (this._crons[key] !== undefined) {
          jobs.push(this._crons[key]);
        }
      });
      return jobs;
    }
    if (!this._crons[_id]) {
      return undefined;
    }
    return this._crons[_id];
  }
  startJob(_id) {
    if (!this._crons[_id]) {
      return false;
    }
    return this._crons[_id].execute();
  }
  deleteJob(_id) {
    if (!this._crons[_id]) {
      return false;
    }
    const deleted = this._crons[_id];
    this._crons[_id] = undefined;
    return deleted;
  }
  update(_id, config) {
    let isStoped = false;

    if (!this._crons[_id]) {
      return false;
    }

    if (this._crons[_id].isRunning()) {
      this._crons[_id].stop();
      isStoped = true;
    }
    config.logger = log;
    const job = new Job(config);
    if (job.error) {
      return job.error;
    }
    this._crons[_id] = job;

    if (isStoped) {
      this._crons[_id].execute();
    }

    return true;
  }
}

module.exports.CronService = CronService;

