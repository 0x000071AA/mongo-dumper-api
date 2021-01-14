/**
 * author: Tim Weber
 * created on 02/16/2018
 *
 */
const Q = require('q');
const { createError, hasAllPropierties, isEmtyObject } = require('../helpers/utils');
const { CronService } = require('../helpers/CronService');
const { PersistenceJob } = require('../helpers/PersinstingService');
const { AppConfig } = require('../configs/global');
const { jsonReadFile } = require('../helpers/promisfy');
const { sha256 } = require('../helpers/utils');

function _switchPush(type, obj, cache) {
  const actions = {
    _commands: () => {
      const found = cache._commands.find(o => o.descriptor === obj.descriptor);
      if (typeof found !== 'undefined') {
        return createError(`Command already exists: ${obj.descriptor}`, 409);
      }
      const gen = { ...obj, id: sha256(obj.descriptor) };
      cache._commands.push(gen);
      return gen;
    },
    _scheduledJobs: () => {
      const found = cache.scheduledJobs.find(o => o.descriptor === obj.descriptor);
      if (typeof found !== 'undefined') {
        return createError(`Schedule already exists: ${obj.descriptor}`, 409);
      }
      const gen = { ...obj, id: sha256(obj.descriptor) };
      cache._scheduledJobs.push(gen);
      return gen;
    },
    _databases: () => {
      const gen = obj.map(cur => ({ ...cur, id: sha256(cur.name) }));
      cache._databases = cache._databases.concat(gen.filter((item, i) => {
        if (cache._databases.length === 0) return true;
        if (cache._databases[i] !== undefined) return cache._databases[i].id !== item.id;
        return true;
      }));
      return cache._databases.slice();
    },
    default: () => createError('Internal error', 500)
  };
  return (actions[type] || actions.default)();
}

class Cache {
  constructor() {
    this._scheduledJobs = [];
    this._commands = [];
    this._cronService = new CronService();
    this._databases = [];
  }

  build() {
    /*
    * Factory function to init Cache. Check data from
    * perstistence.json and load it.
    * */
    jsonReadFile(AppConfig.cacheConfig)
      .then((cache) => {
        if (cache && isEmtyObject(cache)) return;
        Object.keys(cache).forEach((cur) => {
          if (cur === 'cronService') {
            this._cronService = new CronService(cache[cur]);
            return;
          }
          this[`_${cur}`] = cache[cur];
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  push(section, obj) {
    return new Q.Promise((resolve, reject) => {
      const attr = `_${section}`;
      const res = _switchPush(attr, obj, this);
      if (res !== undefined && (res instanceof Error && hasAllPropierties(['status', 'custom'], res))) {
        reject(res);
      } else {
        resolve(res);
      }
    });
  }

  get(section) {
    return new Q.Promise((resolve, reject) => {
      if (!Object.prototype.hasOwnProperty.call(this, `_${section}`)) {
        reject(createError('Internal error', 500));
      } else {
        resolve(this[`_${section}`]);
      }
    });
  }
  getAllSections() {
    return {
      scheduledJobs: 'scheduledJobs',
      commands: 'commands',
      cronService: 'cronService',
      databases: 'databases'
    };
  }
  save() {
    return Object.keys(this.getAllSections()).reduce((obj, cur) => {
      if (cur === 'cronService') {
        return { ...obj, [cur]: this._cronService.getCrons() };
      }
      return { ...obj, [cur]: this[`_${cur}`] };
    }, {});
  }
}

const _Cache = new Cache();
_Cache.build();
const _job = new PersistenceJob(_Cache);

module.exports.Cache = _Cache;
module.exports.cacheIsSaved = _job.isRunning();
