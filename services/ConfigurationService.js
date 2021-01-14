/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 */
const { createError } = require('../helpers/utils');
const { AppConfig } = require('../configs/global');
const promisfy = require('../helpers/promisfy');

// const { Cache } = require('../helpers/Cache');

// const sections = Cache.getAllSections();

exports.configure = (args, res, next) => {
  /**
   * Do basic configuration for api
   *
   * parameters:
   * - body (config):
   *   user String:   User id
   *   root String:   Root directory for application
   *
   * returns Dataresponse ({ message: '', data: []})
   * */
  const config = args.config.value;
  const elm = {
    [config.user]: { ...config }
  };
  promisfy.jsonWriteFile(AppConfig.jsonConfig, elm, config)
    .then((json) => {
      AppConfig.backupBaseDir = config.root;

      res.status(201);
      res.json({ message: 'Configured backup root directory', data: [json] });
    })
    .catch(err => next(err));
};

exports.getConfig = (args, res, next) => {
  /**
   * Get app configuration
   *
   * returns Dataresponse ({ message: '', data: [] })
   * */
  const user = args.user.value;

  promisfy.jsonReadFile(AppConfig.jsonConfig)
    .then((json) => {
      const currentConf = json[user];
      if (!currentConf) {
        next(createError('No configuration for backup directory', 404));
        return;
      }
      res.status(200);
      res.json({ message: 'Retrieved configuration', data: [json] });
    })
    .catch(err => next(err));
};
