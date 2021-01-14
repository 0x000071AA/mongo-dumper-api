/**
 * author: Tim Weber
 * created on 03/16/2018
 *
 * Libary to set global application settings
 *
 * */
const json_data = require('../configs/settings');
const { isEmtyObject } = require('../helpers/utils');

function _fetch() {
  if (isEmtyObject(json_data)) {
    return '';
  }
  return json_data.root;
}

const AppConfig = {
  cacheConfig: `${__dirname}/../configs/persistence.json`,
  jsonConfig: `${__dirname}/../configs/settings.json`,
  backupLogPath: `${__dirname}/../logs/backups/backups.log`,
  recoveryLogPath: `${__dirname}/../logs/recoveries/recoveries.log`,
  backupTmp: `${__dirname}/../backup_tmp`,
  userConfig: `${__dirname}/../configs/Users/users.json`,
  backupBaseDir: _fetch(),
  cronTime: '*/15 * * * * *',
  timeZone: 'Europe/Berlin',
};

module.exports.AppConfig = AppConfig;
