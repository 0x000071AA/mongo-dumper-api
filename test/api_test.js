/* eslint-disable import/no-extraneous-dependencies,no-restricted-syntax */
/**
 * author: Tim Weber
 * created on 02/16/2018
 *
 * defines test for api calls
 *
 */
process.env.NODE_ENV = 'test';

const Mocha = require('mocha');
const chai = require('chai');
const ChaiHttp = require('chai-http');
const server = require('../index');
// const fs = require('fs');
const path = require('path');
const { Cache } = require('../helpers/Cache');
const promisfy = require('../helpers/promisfy');
const TestData = require('../test/data/TestData');
const { userConfig } = require('../configs/global');

const { describe } = Mocha;
const { it } = Mocha;
const { after } = Mocha;
const { before } = Mocha;
const { expect } = chai;
const version = '/dataguard/v1';
const authToken = {};
chai.use(ChaiHttp);

const backup_tmp = path.join(`${__dirname}`, 'data', 'tmp');

function checkErrorRes(el, msg) {
  expect(el.body).to.be.an('object').that.has.all.keys('message', 'error');
  expect(el.body.message).have.string(msg);
}

function checkDataResponse(el, status) {
  expect(el).to.have.status(status);
  expect(el.body).to.has.property('data');
  expect(el.body).to.has.property('message');
  expect(el.body.data).to.be.an('array');
}

// function deleteFile(file) {
//   fs.unlink(file, (error) => {
//     if (error) {
//       throw error;
//     }
//     console.log(`deleted ${file}`);
//   });
// }

describe('MongoLeafDataGuard-Api tests', () => {
  describe('/users', () => {
    it(`404 - GET ${version}/users`, (done) => {
      chai.request(server)
        .get(`${version}/users`)
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No users found');
          done();
        });
    });
    it(`201 - POST ${version}/users`, (done) => {
      chai.request(server)
        .post(`${version}/users`)
        .send({ username: 'admin' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });
    it(`200 - GET ${version}/users`, (done) => {
      chai.request(server)
        .get(`${version}/users`)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - GET ${version}/users?user_id=`, (done) => {
      chai.request(server)
        .get(`${version}/users`)
        .query({ user_id: 'admin' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          authToken.token = res.body.data[0].token;
          done();
        });
    });
    it(`200 - DELETE ${version}/users?user_id=admin`, (done) => {
      chai.request(server)
        .delete(`${version}/users`)
        .set('x-access-token', authToken.token)
        .query({ user_id: 'admin' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`404 - DELETE ${version}/users?user_id=45342`, (done) => {
      chai.request(server)
        .delete(`${version}/users`)
        .set('x-access-token', authToken.token)
        .query({ user_id: '45342' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'User not found');
          done();
        });
    });
    after((done) => {
      const data = {};
      data.users = [{ username: 'admin' }];
      promisfy.jsonWriteFile(userConfig, data, {})
        .then(() => {
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
  });
  describe('/auth', () => {
    it(`200 - GET ${version}/auth`, (done) => {
      chai.request(server)
        .get(`${version}/auth`)
        .query({ token: authToken.token })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`403 - GET ${version}/auth`, (done) => {
      chai.request(server)
        .get(`${version}/auth`)
        .query({ token: '0gdfdgf4545qwWEfaD1' })
        .end((err, res) => {
          expect(err).to.have.status(403);
          checkErrorRes(res, 'Access denied');
          done();
        });
    });
  });
  describe('/configure', () => {
    it(`201 - POST ${version}/configure`, (done) => {
      chai.request(server)
        .post(`${version}/configure`)
        .set('x-access-token', authToken.token)
        .send({ root: 'C:\\workspace' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });
  });
  describe('/databases', () => {
    it(`404 - GET ${version}/databases`, (done) => {
      chai.request(server)
        .get(`${version}/databases`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No databases found');
          done();
        });
    });
    it(`200 - GET ${version}/databases`, (done) => {
      chai.request(server)
        .get(`${version}/databases`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
  });
  describe('/backups', () => {
    const cmdDescriptor = TestData.Command.descriptor;

    it(`404 - GET ${version}/backups`, (done) => {
      chai.request(server)
        .get(`${version}/backups`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'Not found');
          done();
        });
    });
    it(`201 - POST ${version}/backups`, (done) => {
      chai.request(server)
        .post(`${version}/backups`)
        .set('x-access-token', authToken.token)
        .send({ database: 'TestDB', scheduler: 'dummy', command: cmdDescriptor })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });
    it(`200 - GET ${version}/backups`, (done) => {
      chai.request(server)
        .get(`${version}/backups`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - DELETE ${version}/backups?job_descriptor=''`, (done) => {
      chai.request(server)
        .delete(`${version}/backups`)
        .set('x-access-token', authToken.token)
        .query({ job_descriptor: '' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          expect(res.body.data).to.have.property('size', 1);
          done();
        });
    });
    it(`404 - DELETE ${version}/backups?job_descriptor=doesNotExist`, (done) => {
      chai.request(server)
        .delete(`${version}/backups`)
        .set('x-access-token', authToken.token)
        .query({ job_descriptor: 'doesNotExist' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No config found');
          done();
        });
    });
  });
  describe('/backups/{db}', () => {
    let db = 'TestDB';
    it(`200 - GET ${version}/backups/{db}`, (done) => {
      chai.request(server)
        .get(`${version}/backups/${db}`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    db = 'NotExistingDB';
    it(`404 - GET ${version}/backups/{db}`, (done) => {
      chai.request(server)
        .get(`${version}/backups/${db}`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No backups found for database');
          done();
        });
    });
  });
  describe('/backups/{db}/ftps', () => {
    const database = 'TestDB';
    it(`200 - GET ${version}/backups/${database}/ftps`, (done) => {
      chai.request(server)
        .get(`${version}/backups/${database}/ftps`)
        .set('x-access-token', authToken.token)
        .query({ ftp_data: TestData.Ftp, ftp_base_path: '/' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
  });
  describe('/backups/logs', () => {
    it(`200 - GET ${version}/backups/logs`, (done) => {
      chai.request(server)
        .get(`${version}/backups/logs`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - GET ${version}/backups/logs?db_descriptor=TestDB`, (done) => {
      chai.request(server)
        .get(`${version}/backups/logs`)
        .set('x-access-token', authToken.token)
        .query({ db_descriptor: 'TestDB' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`404 - GET ${version}/backups/logs?db_descriptor=dummyTest`, (done) => {
      chai.request(server)
        .get(`${version}/backups/logs`)
        .set('x-access-token', authToken.token)
        .query({ db_descriptor: 'dummyTest' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No logs found');
          done();
        });
    });
    it(`404 - GET ${version}/backups/logs`, (done) => {
      chai.request(server)
        .get(`${version}/backups/logs`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No logs found');
          done();
        });
    });
  });
  describe('/recoveries', () => {
    const cmd = {
      descriptor: 'testrestore',
      command: 'mongorestore',
      parameters: {
        db: 'TestDB',
        username: '',
        password: '',
        host: '',
        port: '',
        authenticationDatabase: '',
      }
    };

    before((done) => {
      const sections = Cache.getAllSections();
      Cache.push(sections.commands, cmd)
        .then(() => done())
        .catch(err => done(err));
    });

    it(`201 - POST ${version}/recoveries`, (done) => {
      chai.request(server)
        .post(`${version}/recoveries`)
        .set('x-access-token', authToken.token)
        .send(TestData.Recovery(`${path.join(backup_tmp, 'Test_2018_2018_03_13.gz')}`))
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });

    it(`201 - POST ${version}/recoveries`, (done) => {
      chai.request(server)
        .post(`${version}/recoveries`)
        .set('x-access-token', authToken.token)
        .send(TestData.Recovery(`${path.join(backup_tmp, 'Test_2018_2018_03_13.gz')}`, TestData.Ftp))
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });
  });
  describe('/recoveries/logs', () => {
    it(`200 - GET ${version}/recoveries/logs`, (done) => {
      chai.request(server)
        .get(`${version}/recoveries/logs`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - GET ${version}/recoveries/logs?db_descriptor=TestDB`, (done) => {
      chai.request(server)
        .get(`${version}/recoveries/logs`)
        .set('x-access-token', authToken.token)
        .query({ db_descriptor: 'TestDB' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`404 - GET ${version}/recoveries/logs`, (done) => {
      chai.request(server)
        .get(`${version}/recoveries/logs`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'No logs found');
          done();
        });
    });
  });
  describe('/schedules', () => {
    it(`201 - POST ${version}/schedules`, (done) => {
      chai.request(server)
        .post(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .send(TestData.Schedule)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });
    it(`200 - GET ${version}/schedules`, (done) => {
      chai.request(server)
        .get(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - GET ${version}/schedules?schedule_descriptor=dummy`, (done) => {
      chai.request(server)
        .get(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .query({ schedule_descriptor: 'dummy' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`404 - GET ${version}/schedules?schedule_descriptor=testschedule`, (done) => {
      chai.request(server)
        .get(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .query({ schedule_descriptor: 'testschedule' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'Schedule not found');
          done();
        });
    });
    it(`200 - PUT ${version}/schedules`, (done) => {
      chai.request(server)
        .put(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .send(TestData.UpdateSchedule())
        .end((err, res) => {
          expect(err).to.equal(null, err);
          expect(res.body).to.have.status(200);
          done();
        });
    });
    it(`200 - DELETE ${version}/schedules?schedule_descriptor=`, (done) => {
      chai.request(server)
        .delete(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .query({ schedule_descriptor: 'test' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          expect(res.body).to.be.an('object').that.has.all.keys('name', 'cron_time', 'timezone', 'start', 'ftp');
          expect(res.body.name).to.equal('test');
          done();
        });
    });
    it(`404 - DELETE ${version}/schedules?schedule_descriptor=`, (done) => {
      chai.request(server)
        .delete(`${version}/schedules`)
        .set('x-access-token', authToken.token)
        .query({ schedule_descriptor: '#_noSchedule' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'Schedule not found');
          done();
        });
    });
    it(`200 - GET ${version}/schedules/{schedule_label}`, (done) => {
      const schedule_label = 'test';
      chai.request(server)
        .get(`${version}/schedules/${schedule_label}`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          done();
        });
    });
  });
  describe('/commands', () => {
    it(`201 - POST ${version}/commands`, (done) => {
      chai.request(server)
        .post(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .send(TestData.Command)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 201);
          done();
        });
    });
    it(`200 - GET ${version}/commands`, (done) => {
      chai.request(server)
        .get(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - GET ${version}/commands?command_descriptor=testCmd`, (done) => {
      chai.request(server)
        .get(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .query({ command_descriptor: 'testCmd' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`404 - GET ${version}/commands?command_descriptor=1234`, (done) => {
      chai.request(server)
        .get(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .query({ command_descriptor: '1234' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'Not found');
          done();
        });
    });
    it(`200 - PUT ${version}/commands`, (done) => {
      chai.request(server)
        .put(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .send(TestData.UpdateCommand())
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - DELETE ${version}/commands?command_descriptor=testCmd`, (done) => {
      chai.request(server)
        .delete(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .query({ command_descriptor: 'testCmd' })
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`200 - GET ${version}/commands/{type}`, (done) => {
      const type = 'mongodump';
      chai.request(server)
        .get(`${version}/commands/${type}`)
        .set('x-access-token', authToken.token)
        .end((err, res) => {
          expect(err).to.equal(null, err);
          checkDataResponse(res, 200);
          done();
        });
    });
    it(`404 - DELETE ${version}/commands?command_id=45685`, (done) => {
      chai.request(server)
        .delete(`${version}/commands`)
        .set('x-access-token', authToken.token)
        .query({ command_id: '123456' })
        .end((err, res) => {
          expect(err).to.have.status(404);
          checkErrorRes(res, 'Command not found');
          done();
        });
    });
  });
});
