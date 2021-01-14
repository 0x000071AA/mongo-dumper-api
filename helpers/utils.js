/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 * Libary for util functions
 * */
const moment = require('moment');
const crypto = require('crypto');

function _strInject(str) {
  /**
   * function to inject current timestamp into archive name
   * using a regex that matches file and file extension.
   *
   * */
  // let newStr = str.slice();
  const timestamp = moment().format('YYYY_MM_DD_HH[h]mm[m]ss[s]');
  const newStr = str.replace(/(\w+)\.([a-z]+)$/, `$1_${timestamp}.$2`);
  return newStr;
}

module.exports.isEmtyObject = obj => Object.keys(obj).length === 0;

module.exports.createError = (msg, code) => {
  const error = new Error(msg);
  error.status = code;
  error.custom = true;
  return error;
};

module.exports.commandStringify = (cmd, options, archive) => {
  let command;
  if (typeof archive !== 'undefined') {
    command = `${cmd} --archive=${cmd === 'mongorestore' ? archive : _strInject(archive)} --gzip`;
  } else {
    command = `${cmd} --gzip`;
  }
  Object.keys(options).forEach((key) => {
    if (!options[key]) { options[key] = '""'; }
    if (key === 'archive') {
      command += ` --${key}=${_strInject(options[key])}`;
    } else if (key === 'db' && cmd === 'mongorestore') {
      command += ` --nsInclude ${options[key]}.*`;
    } else {
      command += ` --${key} ${options[key]}`;
    }
  });
  if (cmd === 'mongorestore') {
    command += ' --drop';
  }
  command += ' -v';
  return command;
};

module.exports.hasAllPropierties = (arr, obj) => arr.every(p => Object.prototype.hasOwnProperty.call(obj, p));

module.exports.isEmptyString = value => typeof value === 'string' && !value.trim();

module.exports.strInject = _strInject;

module.exports.sha256 = value => crypto.createHash('sha256').update(value, 'binary').digest('base64');
