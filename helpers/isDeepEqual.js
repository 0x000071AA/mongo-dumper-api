/**
 * author: Tim Weber
 * created on 07/31/2018
 *
 * Compare two object for strict equality
 * */

const typeOf = x => ({}).toString.call(x).match(/\[object (\w+)]/)[1];

function isDeepEqual(obj, cmp) {
  if (typeOf(obj) !== typeOf(cmp)) return false;
  const everyKey = f => Object.keys(obj).every(f);

  switch (typeOf(obj)) {
    case 'Array':
      return obj.length === cmp.length && everyKey(key => isDeepEqual(obj.sort()[key], cmp.sort()[key]));
    case 'Object':
      return Object.keys(obj).length === Object.keys(cmp).length && everyKey(key => isDeepEqual(obj[key], cmp[key]));
    default:
      return obj === cmp;
  }
}

module.exports.isDeepEqual = isDeepEqual;
