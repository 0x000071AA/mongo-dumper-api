/**
 * author: Tim Weber
 * created on 07/31/2018
 *
 * */
const { CronJob } = require('cron');
const { to } = require('../helpers/awaitTo');
const { isDeepEqual } = require('../helpers/isDeepEqual');
const { jsonReadFile, jsonWriteFile } = require('../helpers/promisfy');
const { AppConfig } = require('../configs/global');

class PersistenceJob {
  constructor(cache) {
    this._callback = async () => {
      let err;
      let data;
      const _cache = cache.save();

      [err, data] = await to(jsonReadFile(AppConfig.cacheConfig));
      if (data && isDeepEqual(data, _cache)) {
        return;
      } else if (err) {
        console.log(err);
        return;
      }
      [err, data] = await to(jsonWriteFile(AppConfig.cacheConfig, _cache));
      if (err) console.log(new Error('Failed to update config'));
    };

    if (this._callback === undefined) {
      this.error = new Error(`Error: ${this.action} is not a valid action`);
      return;
    }

    try {
      this._job = new CronJob({
        start: true,
        cronTime: AppConfig.cronTime,
        timeZone: AppConfig.timeZone,
        onTick: this._callback
      });
    } catch (e) {
      this.error = new Error('Internal Error: Invalid cron settings');
    }
  }
  stop() {
    if (this.error === undefined && this._job.running) {
      this._job.stop();
    }
  }
  isRunning() {
    return !!(typeof this._job !== 'undefined' && this._job.running);
  }
}

module.exports.PersistenceJob = PersistenceJob;
