/**
 * author: Tim Weber
 * created on 07/31/2018
 *
 * */
module.exports.to = promise =>
  /*
  Helper function that eliminates use of try-catch blocks for async await

  params:
  promise Promise:    function that returns a promise

  return:   Array including error/data
  * */
  promise.then(data => [null, data])
    .catch(err => [err]);

