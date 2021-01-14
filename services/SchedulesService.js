/* eslint-disable no-unused-vars */
/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 *
 */
const { createError, isEmptyString, hasAllPropierties } = require('../helpers/utils');
const { Cache } = require('../helpers/Cache');
const Q = require('q');
const { Paginator } = require('../helpers/Paginator');

const sections = Cache.getAllSections();


exports.createSchedule = (args, res, next) => {
  /**
   * Create a new cron job configuration (post)
   *
   * parameters:
   * - body (schedule)
   *   label String:        Schedule label
   *   descriptor String:   Schedule descriptor
   *   command_id String:      Command descriptor
   *   options Object:  Options for cron
   *                        ( cronTime String:    Cron patterns
   *                          timeZone String:     Timezone for cron
   *                          action String:      backup or delete)
   *   use_ftp Boolean:     Activate ftp
   *   ftp Object:          Defines an ftp-Server ({ user: '', password: '', host: '', basePath: ''})
   * */
  const schedule = args.schedule.value;

  if (!schedule.descriptor || isEmptyString(schedule.descriptor)) {
    next(createError('Bad Request: Empty descriptor', 400));
    return;
  } else if (typeof schedule.options === 'undefined') {
    next(createError('Bad Request: Required parameter options', 400));
    return;
  }

  const config = Object.keys(schedule).reduce((obj, item) => {
    if (item === 'options') {
      obj[item] = Object.keys(schedule[item])
        .reduce((opts, cu) => {
          opts[cu] = schedule[item][cu];
          return opts;
        }, {});
      return obj;
    }
    obj[item] = schedule[item];
    return obj;
  }, {});

  // find command
  Cache.get(sections.commands)
    .then((commands) => {
      const cmd = commands.find(o => o.descriptor === schedule.command_id);

      if (typeof cmd === 'undefined') {
        throw createError(`Command not found: ${schedule.command_id}`, 404);
      }
      config.command = cmd;
      return Cache.get(sections.cronService);
    })
    .then((crons) => {
      const newCron = crons.initCronService(schedule.descriptor, config);

      if (newCron instanceof Error || hasAllPropierties(['status', 'custom'], newCron)) {
        throw newCron;
      }
      res.status(201);
      res.json({ message: `Created Schedule: ${schedule.descriptor}`, data: [config] });
    })
    .catch(err => next(err));
};

exports.deleteSchedule = (args, res, next) => {
  /**
   * Delete schedule by descriptor. Schedule will not be deleted,
   * if it is still used by a job
   *
   * parameters:
   * - query:
   *   schedule_descriptor String:  Descriptor <?schedule_descriptor=test (required)>

   * returns Object ({ message: 'Schedule deleted', data: []})
   * */
  const scheduleDescriptor = args.schedule_descriptor.value;

  if (!scheduleDescriptor) {
    next(createError('Bad Request: Empty descriptor', 400));
    return;
  }
  Cache.get(sections.scheduledJobs)
    .then((running) => {
      const usedSchedule = running.find(o => o.schedule === scheduleDescriptor);
      if (typeof usedSchedule === 'undefined' && running.length !== 0) {
        throw createError(`Schedule still in use: ${scheduleDescriptor}`, 409);
      }
      return Cache.get(sections.cronService);
    })
    .then((service) => {
      const deletedSchedule = service.getJobs(scheduleDescriptor);
      if (typeof deletedSchedule === 'undefined') {
        throw createError(`Schedule not found: ${scheduleDescriptor}`, 404);
      }
      const deleted = service.deleteJob(scheduleDescriptor);

      if (!deleted) {
        throw createError('Schedule could not be deleted', 500);
      }
      res.status(200);
      res.json({ message: `Deleted schedule: ${scheduleDescriptor}`, data: [deleted.toJson()] });
    })
    .catch(err => next(err));
};

exports.getSchedulesByLabel = (args, res, next) => {
  /**
   * Retrieve schedules filtered by label
   *
   * parameters:
   * - path:
   *   schedule_label String:   Filter for schedules
   *
   *  returns DataResponse ({ message: 'OK', data: []})
   * */
  const scheduleLabel = args.schedule_label.value;

  Cache.get(sections.cronService)
    .then((crons) => {
      const schedules = crons.getJobs();

      if (typeof schedules === 'undefined') {
        throw createError(`Not found: ${scheduleLabel}`, 404);
      }
      const filteredSchedules = schedules.filter(o => o.label === scheduleLabel);
      if (filteredSchedules && filteredSchedules.length === 0) {
        throw createError(`Not found: ${scheduleLabel}`, 404);
      }
      res.status(200);
      res.json({ message: 'Retireved schedules by label', data: filteredSchedules.map(o => o.toJson()) });
    })
    .catch(err => next(err));
};

exports.getSchedules = (args, res, next) => {
  /**
   * Retrieve all cron job configuration. Result can be filtered
   * with query parameters.
   *
   * parameters:
   * - query:
   *   schedule_descriptor String:  Descriptor <?schedule_descriptor=test (optional)>
   *
   * returns DataResponse ({ message: 'OK', data: []})
   * */
  const scheduleDescriptor = args.schedule_descriptor.value;
  const limit = args.limit.value;
  const page = args.page.value;

  Cache.get(sections.cronService)
    .then((crons) => {
      if (typeof scheduleDescriptor !== 'undefined') {
        const schedule = crons.getJobs(scheduleDescriptor);

        if (typeof schedule === 'undefined') {
          throw createError(`Schedule not found: ${scheduleDescriptor}`, 404);
        }
        res.status(200);
        return res.json({ message: `Retrieved schedule: ${scheduleDescriptor}`, data: [schedule.toJson()] });
      }
      const schedules = crons.getJobs();
      if (schedules && schedules.length === 0) {
        throw createError('No schedules found', 404);
      }
      const resSchedules = schedules.map(o => o.toJson());
      if (limit && page) {
        const _paginator = Paginator(resSchedules)(limit, page);
        res.status(200);
        return res.json({ message: `Retrieved schedules - page: ${page}`, data: [_paginator] });
      }
      res.status(200);
      return res.json({ message: 'Retrieved schedules', data: resSchedules });
    })
    .catch(err => next(err));
};

exports.updateSchedule = (args, res, next) => {
  /**
   * Update schedule configuration. If a schedule is in use,
   * stop job, update schedule and start it again
   *
   * parameters:
   * - body (schedule)
   *   label String:        Label for schedule
   *   descriptor String:   Schedule descriptor
   *   command_id String:   Update command
   *   action String:       Backup/Recovery/Deletion
   *   options Object:  Options for cron
   *                        ( cronTime String:    Cron patterns
   *                          timeZone String:     Timezone for cron
   *   use_ftp Boolean:     Activate ftp
   *   ftp Object:          Defines an ftp-Server ({ user: '', password: '', host: '', basePath: ''})
   *
   * returns { message: 'Updated', data: []}
   * */
  const schedule = args.schedule.value;

  if (isEmptyString(schedule.descriptor)) {
    next(createError('Bad Request: Empty descriptor', 400));
    return;
  }
  Q.all([
    Cache.get(sections.cronService),
    Cache.get(sections.commands)
  ])
    .spread((crons, commands) => {
      const scheduleUpdated = crons.getJobs(schedule.descriptor);
      if (typeof scheduleUpdated === 'undefined') {
        throw createError(`Schedule not found: ${schedule.descriptor}`, 404);
      }

      // {label: '', descriptor:' ', cronTime:'', timeZone:'', useFtp: '', ftp: {}, logger:
      //   log.logger}
      // update: label, useFtp, ftp { host:'', user:'', password:'', basePath:'' }
      //          options { cronTime:'', timeZone:'' }
      // const updatableFields = ['label', 'useFtp', 'ftp', 'options'];
      // const deepUpdatable = {
      //   ftp: ['password', 'host', 'user', 'basePath'],
      //   options: ['cronTime', 'timeZone'],
      // };

      const config = Object.keys(schedule).filter(key => key !== 'command_id')
        .reduce((obj, item) => {
          if (item === 'options') {
            obj[item] = Object.keys(schedule[item])
              .reduce((opts, cu) => {
                opts[cu] = schedule[item][cu];
                return opts;
              }, {});
            return obj;
          }
          obj[item] = schedule[item];
          return obj;
        }, {});

      config.logger = scheduleUpdated.logger;

      const cmdFound = commands.find(o => o.descriptor === schedule.command_id);
      if (typeof cmdFound === 'undefined') {
        throw createError(`Command not found: ${schedule.command_id}`, 404);
      }
      config.command = cmdFound;

      const updated = crons.update(schedule.descriptor, config);
      if (updated instanceof Error || hasAllPropierties(['status', 'custom'], updated)) {
        throw updated;
      } else if (!updated) {
        throw createError(`Schedule does not exist: ${schedule.descriptor}`, 404);
      }
      res.status(200);
      res.json({ message: `Updated schedule: ${schedule.descriptor}`, data: [config] });
    })
    .catch(err => next(err));
};

