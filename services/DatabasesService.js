/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 */
const { shellExec } = require('../helpers/promisfy');
const { createError } = require('../helpers/utils');
const { Cache } = require('../helpers/Cache');

const sections = Cache.getAllSections();

exports.getDatabases = (args, res, next) => {
  /**
   * Retrieve mongo databases running on server
   * by running 'mongo --quiet --eval "printjson(db.adminCommand('listDatabases'))"'
   *
   * returns Dataresponse ({ message: '', data: []})
   * */
  const listDatabases = 'mongo --quiet --eval "printjson(db.adminCommand(\'listDatabases\'))"';

  shellExec(listDatabases, true)
    .then((json) => {
      if (json.out.databases.length === 0 && json.out.databases) {
        throw createError('No databases found', 404);
      }

      return Cache.push(sections.databases, json.out.databases);
    })
    .then((databases) => {
      res.status(200);
      res.json({ message: 'Retrieved databases', data: databases });
    })
    .catch(err => next(err));
};
