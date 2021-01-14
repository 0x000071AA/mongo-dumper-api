/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 * Libary for wrapping functions with promises
* */
const Q = require('q');
const fs = require('fs');
const { createError } = require('../helpers/utils');
const { exec, mkdir } = require('shelljs');

module.exports.jsonReadFile = (file) => {
  const deferred = Q.defer();
  fs.readFile(file, (err, obj) => {
    if (err) {
      deferred.reject(createError(`Internal error: ${err}`, 500));
    } else {
      try {
        const json = JSON.parse(obj);
        deferred.resolve(json);
      } catch (e) {
        deferred.reject(createError(`Internal error: ${e}`, 500));
      }
    }
  });
  return deferred.promise;
};

module.exports.jsonWriteFile = (file, obj, json) => {
  const deferred = Q.defer();
  let data = null;
  try {
    data = JSON.stringify(obj);
  } catch (e) {
    deferred.reject(createError(`Internal error: ${e}`, 500));
    return deferred.promise;
  }

  fs.writeFile(file, data, (err) => {
    if (err) {
      deferred.reject(createError(`Internal error: ${err}`, 500));
    } else {
      deferred.resolve(json);
    }
  });
  return deferred.promise;
};

module.exports.shellExec = (command, json) => {
  /**
   * Wrap shelljs`s exec function into a promise.
   * If json is true, the promise will return a json object
   * otherwise it returns an array with result messages
   *
   * Hint: mongodump and mongorestore writes verbosity logs to stderr
   *
   */
  const json_out = typeof json !== 'undefined' ? json : false;

  const deferred = Q.defer();
  exec(command, { silent: true, stdio: 'inherit' }, (code, stdout, stderr) => {
    if (code !== 0) {
      const out = stderr.split(/[\r\n]+/);
      deferred.reject(createError(`Internal error: ${out} exit with ${code}`, 500));
      return;
    }
    // split string by EOL using a regex to support different platforms
    if (!json_out) {
      const out = stderr.split(/[\r\n]+/);
      deferred.resolve({ code: code, out: out });
      return;
    }
    let cmdOutput;
    try {
      cmdOutput = JSON.parse(stdout);
    } catch (err) {
      deferred.reject(createError(`Internal error: ${err}`, 500));
      return;
    }
    deferred.resolve({ code: code, out: cmdOutput });
  });
  return deferred.promise;
};

module.exports.mkdirp = (dir) => {
  const deferred = Q.defer();
  try {
    const res = mkdir('-p', dir);
    if (res.code === 0) {
      deferred.resolve(res);
    } else {
      throw createError(res.stderr, 500);
    }
  } catch (err) {
    deferred.reject(err);
  }
  return deferred.promise;
};
