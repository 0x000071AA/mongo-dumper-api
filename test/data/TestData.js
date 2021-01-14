/**
 * Libary to provide test data
 *
 * */

const Command = {
  descriptor: 'testCmd',
  command: 'mongodump',
  parameters: {
    archive: 'dummyarchive.gz',
    db: 'dummyDB',
    host: '',
    port: '',
    username: '',
    password: '',
    authenticationDatabase: ''
  }
};

const Ftp = {
  user: 'test',
  host: 'localhost',
  port: 21
};

const Schedule = {
  descriptor: 'dummy',
  label: 'test',
  command_id: 'testCmd',
  use_Ftp: false,
  action: 'backup',
  options: { cronTime: '*/5 * * * * *', timeZone: 'Europe/Berlin' },
  ftp: {}
};

module.exports.Recovery = (archive, ftp) => ({
  recovery_command: 'testrestore',
  database: 'TestDB',
  archive: archive,
  ftp: ftp || {}
});

module.exports.UpdateCommand = () => {
  const newCommand = Object.assign({}, Command);
  newCommand.parameters.archive = 'updatedArchive.gz';
  newCommand.parameters.db = 'TestDB';
  return newCommand;
};

module.exports.UpdateSchedule = () => {
  const newSchedule = Object.assign(Schedule, {});
  newSchedule.use_Ftp = true;
  newSchedule.ftp = {};
  return newSchedule;
};

module.exports.Command = Command;
module.exports.Ftp = Ftp;
module.exports.Schedule = Schedule;
