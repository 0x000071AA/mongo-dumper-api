/**
 * author: Tim Weber
 * created on 02/19/2018
 *
 * Defines api for user service:
 * User can be created, deleted and retrieved. The user data
 * is saved in an simple JSON-File
 *
 */
const { jsonReadFile, jsonWriteFile } = require('../helpers/promisfy');
const { createError } = require('../helpers/utils');
const Q = require('q');
const { AppConfig } = require('../configs/global');
const { Jwt } = require('../helpers/jwt');
const { sha256 } = require('../helpers/utils');
const { Paginator } = require('../helpers/Paginator');

const { userConfig } = AppConfig;

exports.createUser = (args, res, next) => {
  /**
   * Create new user with password and rewrite the
   * user config file.
   *
   * parameters:
   * - body (user):
   *   username string:  Name for user
   * */
  const user = args.user.value;

  jsonReadFile(userConfig)
    .then((obj) => {
      const found = obj.users.find(o => o.username === user.username);
      if (typeof found !== 'undefined') {
        throw createError('User already exists', 409);
      }
      const newUser = { ...user, id: sha256(user.username) };
      obj.users.push(newUser);
      return jsonWriteFile(userConfig, obj, newUser);
    })
    .then((userobj) => {
      res.status(201);
      res.json({ message: `Created user: ${user.username}`, data: [userobj] });
    })
    .catch(err => next(err));
};

exports.deleteUser = (args, res, next) => {
  /**
   * Checks for the existence of the user_id defined by the query
   * parameter. An existing user will be deleted, otherwise
   * an error message is returned.
   *
   * parameters:
   * - query:
   *   user_id String: hash id <?user_id=testuser (required)>
   *
   * returns Dataresponse ({ message: '', data: []})
   * */
  const userId = args.user_id.value;

  if (!userId) {
    next(createError('Bad Request: Empty descriptor', 400));
    return;
  }
  jsonReadFile(userConfig)
    .then((obj) => {
      if (typeof obj.users.find(o => o.username === userId) === 'undefined') {
        throw createError(`User not found: ${userId}`, 404);
      }
      obj.users = obj.users.filter(item => item.username !== userId);
      return jsonWriteFile(userConfig, obj, userId);
    })
    .then((uId) => {
      res.status(200);
      res.json({ message: `Deleted user: ${userId}`, data: [uId] });
    })
    .catch(err => next(err));
};

exports.getUsers = (args, res, next) => {
  /**
   * Get all users by reading the user config file. Using query parameter to
   * filter for one specific user
   *
   * parameters:
   * - query
   *   user_id String:    Username
   *
   * returns Dataresponse ({ message: '', data: []})
   * */
  const userId = args.user_id.value;
  const limit = args.limit.value;
  const page = args.page.value;

  jsonReadFile(userConfig)
    .then((obj) => {
      if (obj.users && obj.users.length === 0) {
        throw createError('No users found', 404);
      }
      const response = { message: 'Retrieved users', data: [] };
      if (limit && page) {
        const _paginator = Paginator(obj.users)(limit, page);
        response.data = [_paginator];
      } else {
        response.data = obj.users;
      }

      if (typeof userId !== 'undefined') {
        const found = obj.users.find(o => o.username === userId);
        if (typeof found === 'undefined') {
          throw createError(`User not found: ${userId}`, 404);
        }
        response.data = [found];
        response.message = `Retrieved user: ${userId}`;
        return [response, Jwt.createToken(found)];
      }

      return [response, new Q.Promise(resolve => resolve(undefined))];
    })
    .spread((response, token) => {
      if (typeof userId !== 'undefined') {
        response.data[0].token = token;
      }
      res.status(200);
      res.json(response);
    })
    .catch(err => next(err));
};

