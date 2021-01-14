/**
 * author: Tim Weber
 * created on 02/21/2018
 *
 * Libary for ftp functions that return a promise
 *
* */
const { createError } = require('../helpers/utils');
const Client = require('ftp');
const fs = require('fs');
const Q = require('q');


class PromiseFtp {
  constructor() {
    this._client = new Client();
    this._useCompression = false;
  }
  connect(options) {
    let opts;
    if (options !== undefined) {
      const filter = ['basePath'];
      opts = Object.keys(options)
        .filter(key => !filter.includes(key))
        .reduce((obj, item) => {
          obj[item] = options[item];
          return obj;
        }, {});
    }
    return new Q.Promise((resolve, reject) => {
      this._client.on('error', reject);
      this._client.on('ready', resolve);
      this._client.connect(opts);
    });
  }
  get(file, target) {
    return new Q.Promise((resolve, reject) => {
      this._client.get(file, this._useCompression, (err, stream) => {
        if (err) {
          reject(createError(err, 500));
        } else {
          stream.pipe(fs.createWriteStream(target));
          resolve(target);
        }
      });
    });
  }
  put(src, target) {
    return new Q.Promise((resolve, reject) => {
      this._client.put(src, target, this._useCompression, (err) => {
        if (err) {
          reject(createError(err, 500));
        } else {
          resolve(target);
        }
      });
    });
  }
  delete(file) {
    return new Q.Promise((resolve, reject) => {
      this._client.delete(file, (err) => {
        if (err) {
          reject(createError(err, 500));
        } else {
          resolve(file);
        }
      });
    });
  }

  cwd(path) {
    return new Q.Promise((resolve, reject) => {
      this._client.cwd(path, (err, curDir) => {
        if (err) {
          reject(err);
        } else {
          resolve(curDir);
        }
      });
    });
  }
  _list(dirPath) {
    return new Q.Promise((resolve, reject) => {
      this._client.list(dirPath, this._useCompression, (err, list) => {
        if (err) {
          reject(createError(err, 500));
        } else {
          resolve(list);
        }
      });
    });
  }
  list(path) {
    /**
     * List files of directory depending on the current working
     * directory of an ftp server. Subdirectories will be ignored.
     *
     * returns promise
     * */
    const files = [];

    return new Q.Promise((resolve, reject) => {
      this.cwd(path)
        .then(() => this._list(path))
        .then((results) => {
          results.forEach((obj) => {
            if (obj.type !== 'd') {
              files.push({ name: obj.name, size: obj.size, date: obj.date });
            }
          });
          resolve(files);
        })
        .catch(err => reject(err));
    });
  }
  mkdirp(path) {
    return new Q.Promise((resolve, reject) => {
      this._client.mkdir(path, true, (err) => {
        if (err) {
          reject(createError(err, 500));
        } else {
          resolve(path);
        }
      });
    });
  }
  end() {
    return new Q.Promise((resolve, reject) => {
      this._client.end();
      resolve();
    });
  }
}

module.exports.PromiseFtp = PromiseFtp;
