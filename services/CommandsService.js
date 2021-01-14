/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 *
 */
const { createError, hasAllPropierties } = require('../helpers/utils');
const { Cache } = require('../helpers/Cache');
const { AppConfig } = require('../configs/global');
const { Paginator } = require('../helpers/Paginator');
const path = require('path');
const Q = require('q');

const sections = Cache.getAllSections();
const { backupBaseDir } = AppConfig;

const promises = [
  Cache.get(sections.commands),
  Cache.get(sections.scheduledJobs),
  Cache.get(sections.cronService),
  Cache.get(sections.databases)
];

exports.createMongoDbCommand = (args, res, next) => {
  /**
   * Creates a new MongoDB backup or recovery command (post)
   *
   * parameters:
   * - body (command):
   *   descriptor String:   Descriptor for a command
   *   command String:      backup/recovery/deletion command (mongodump/mongorestore/delete)
   *   parameters Object:   command parameters
   *
   * */
  const command = args.command.value;
  const cmdParams = command.parameters;
  const requiredForDel = ['db', 'pattern'];
  // object for deletion command { descriptor: '', command: 'delete', parameters: { db: '', pattern: ''} }

  Q.all([
    Cache.get(sections.commands),
    Cache.get(sections.databases)
  ])
    .spread((commands, databases) => {
      // check command for archive
      const params = Object.keys(cmdParams);

      let checkBody;
      if (command.command === 'delete') {
        checkBody = requiredForDel.every(item => params.includes(item));
        const matched = cmdParams.pattern.match(/(>=|[>])\s*(\d+)/);
        if (matched === null) {
          throw createError(`Invalid pattern: ${cmdParams.pattern}`, 409);
        }
      }
      if (typeof checkBody !== 'undefined' && !checkBody) {
        throw createError(`Missing parameters: ${requiredForDel}`, 400);
      }
      const dbFound = databases.find(o => o.name === cmdParams.db);
      if (typeof dbFound === 'undefined') {
        throw createError(`Database not found: ${cmdParams.db}`, 404);
      }
      if (typeof cmdParams.archive !== 'undefined') {
        cmdParams.archive = path.join(backupBaseDir, 'dumps', cmdParams.db, cmdParams.archive);
      }
      return Cache.push(sections.commands, command);
    })
    .then(() => {
      res.status(201);
      res.json({ message: `Command created: ${command.descriptor}`, data: [command] });
    })
    .catch(err => next(err));
};

exports.deleteCommandConfig = (args, res, next) => {
  /**
   * Delete command config with a certain command_descriptor. Query
   * parameter is required.
   *
   * parameters:
   * - query:
   *   command_descriptor String:   id for command <?command_id=123 (required)>
   *
   * returns Dataresponse ({ message: '', data: []})
   * */
  const cmdDescriptor = args.command_descriptor.value;
  if (!cmdDescriptor) {
    next(createError('Bad Request: Empty descriptor', 400));
    return;
  }

  Q.all(promises)
    .spread((commands, schedules, crons) => {
      const cmdFound = commands.find(o => o.descriptor === cmdDescriptor);
      if (typeof cmdFound === 'undefined') {
        throw createError(`Command not found: ${cmdDescriptor}`, 404);
      }

      const jobInUse = schedules.find(o => o.schedule === cmdDescriptor);
      if (typeof jobInUse !== 'undefined') {
        throw createError(`Command still in use: ${cmdDescriptor}`, 409);
      }
      const allCrons = crons.getJobs();
      const found = allCrons.find(o => o.command.descriptor === cmdDescriptor);
      if (typeof found !== 'undefined') {
        throw createError(`Command still in use: ${cmdDescriptor} in schedule: ${found}`, 409);
      }

      const deleted = commands.splice(commands.indexOf(cmdFound), 1);
      if (deleted && deleted.length === 0) {
        throw createError(`Could not delete job: ${cmdDescriptor}`, 500);
      }

      res.status(200);
      res.json({ message: `Deleted Command: ${cmdDescriptor}`, data: deleted });
    })
    .catch(err => next(err));
};

exports.updateMongoDbCommand = (args, res, next) => {
  /**
   *  Update a MongoDB command by descriptor. It is not supported to
   *  change the type of an command
   *
   *  parameters:
   *  - body (command)
   *    descriptor String:    Command id
   *    parameters Object:    Comand options
   *
   *    returns Dataresponse ({ message: '', data: []})
   * */
  const command = args.command.value;
  const cmdParams = command.parameters;

  Q.all([
    Cache.get(sections.commands),
    Cache.get(sections.databases),
    Cache.get(sections.cronService)
  ])
    .spread((commands, databases, crons) => {
      const found = commands.find(o => o.descriptor === command.descriptor);
      // object for deletion command { descriptor: '', command: 'delete', parameters: { db: '', pattern: ''} }
      if (typeof found === 'undefined') {
        throw createError(`Command not found: ${command.descriptor}`, 404);
      }
      // { "descriptor": "test", "command": "mongorestore", "parameters": {"db": "TestDB", "archive": "",
      // "username": "",
      //   "password": "", "host": "", "port": "", "authenticationDatabase": ""}}
      // validate database and if it is a command for deletion, validate pattern
      const keys = Object.keys(cmdParams);

      if (found.command === 'delete') {
        const fields = ['db', 'pattern'];
        let err;
        fields.every((key) => {
          if (keys.includes(key)) {
            // check the pattern for deleting old backups
            if (key === 'pattern') {
              const matched = key.match(/(>=|[>])\s*(\d+)/);
              if (matched === null) {
                err = createError(`Invalid pattern: ${cmdParams.pattern}`, 409);
                return false;
              }
            }
            if (key === 'db') {
              const foundDb = databases.find(item => item === key);
              if (typeof foundDb === 'undefined') {
                err = createError(`Database not found: ${key}`, 404);
                return false;
              }
            }
            return true;
          }
          err = createError(`Bad request: ${key} required`, 409);
          return false;
        });

        if (err) {
          throw err;
        }
      }

      if (typeof found.parameters.archive !== 'undefined') {
        command.parameters.archive = path.join(backupBaseDir, 'dumps', cmdParams.db, path.basename(cmdParams.archive));
      }
      const updated = commands.splice(commands.indexOf(found), 1, command);

      if (updated && updated.length === 0) {
        throw createError('Internal error', 500);
      }
      // get all schedules which use command, and restart them with new command
      // if job is running, stop job, reinit job with new command and start it again
      // if job is not running just reinit job
      const jobs = crons.getJobs()
        .filter(jobObj => jobObj.command.descriptor === command.descriptor);
      for (let i = 0, len = jobs.length; i < len; i++) {
        const jobOptions = jobs[i].toJson();
        jobOptions.command = command;
        const isUpdated = crons.update(jobOptions.descriptor, jobOptions);

        if (isUpdated instanceof Error && hasAllPropierties(['status', 'custom'], updated)) {
          throw isUpdated;
        } else if (!isUpdated) {
          throw createError(`Schedule does not exist: ${jobOptions.descriptor}`, 404);
        }
      }
      res.status(200);
      res.json({ message: `Updated command: ${command.descriptor}`, data: [command] });
    })
    .catch(err => next(err));
};


exports.getMongoDbCommandsByType = (args, res, next) => {
  /**
   *  Retrieve MongoDB commands for a specific type (mongodump/mongorestore/delete)
   *
   *  parameters:
   *  - path:
   *    type String:   type of command (mongodump/mongorestore/delete)
   *
   *  returns Dataresponse ({ message: '', data: []})
   */
  const type = args.type.value;
  const types = ['mongodump', 'mongorestore', 'delete'];

  if (!types.includes(type)) {
    next(createError(`No type found: ${type}`, 404));
    return;
  }
  Cache.get(sections.commands)
    .then((commands) => {
      const cmdsFound = commands.filter(o => o.command === type);
      if (cmdsFound && cmdsFound.length === 0) {
        throw createError('No commands found', 404);
      }
      res.status(200);
      res.json({ message: 'Retrieved commands by type', data: cmdsFound });
    })
    .catch(err => next(err));
};

exports.getMongoDbCommands = (args, res, next) => {
  /**
   * Retriev all configured MongoDB commands. Using a query parameter
   * command_descriptor will retrieve only the command with that id.
   *
   * parameters:
   * - query:
   *   command_descriptor String:   id for command <?command_id=123 (optional)>
   *
   * returns Dataresponse ({ message: '', data: []})
   * */
  const cmdDescriptor = args.command_descriptor.value;
  const limit = args.limit.value;
  const page = args.page.value;

  Cache.get(sections.commands)
    .then((commands) => {
      if (typeof cmdDescriptor === 'undefined') {
        if (commands && commands.length === 0) {
          throw createError('No Commands found', 404);
        }
        if (limit && page) {
          const _paginator = Paginator(commands)(limit, page);
          res.status(200);
          return res.json({ message: `Retrieved commands - page: ${page}`, data: [_paginator] });
        }
        res.status(200);
        return res.json({ message: 'Retrieved commands', data: commands });
      }
      const found = commands.find(o => o.descriptor === cmdDescriptor);
      if (typeof found === 'undefined') {
        throw createError(`Command not found: ${cmdDescriptor}`, 404);
      }
      res.status(200);
      return res.json({ message: `Retrieved command: ${cmdDescriptor}`, data: [found] });
    })
    .catch(err => next(err));
};
