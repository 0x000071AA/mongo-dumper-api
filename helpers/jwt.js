/**
 * author: Tim Weber
 * created on 03/14/2018
 *
 * Libary for creating and verifying json web tokens
 * */

const jwt = require('jsonwebtoken');
const Q = require('q');
const { createError } = require('../helpers/utils');

class Jwt {
  constructor() {
    this._secret = 'MnZVeD79Tljz5=C%N+1,]Q4hDujon';
    this._algorithm = 'HS256';
  }

  createToken(payload, expiresIn = '24h') {
    const deferred = Q.defer();

    const options = {
      expiresIn: expiresIn,
      algorithm: this._algorithm
    };
    jwt.sign(payload, this._secret, options, (err, token) => {
      if (err) {
        deferred.reject(err);
        return;
      }
      const decoded = jwt.decode(token, { complete: true });

      deferred.resolve({ token: token, expiresIn: decoded.payload.exp });
    });

    return deferred.promise;
  }

  verify(token) {
    const deferred = Q.defer();

    if (!token) {
      deferred.reject(createError('Provide a token', 400));
      return deferred.promise;
    }

    jwt.verify(token, this._secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          deferred.reject(createError('Token expired', 409));
        } else {
          deferred.reject(createError('Invalid token', 409));
        }
        return;
      }
      deferred.resolve({ token: token, ...decoded });
    });

    return deferred.promise;
  }
}

module.exports.Jwt = new Jwt();
