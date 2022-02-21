import _ from 'lodash';

function isW3cCaps (caps) {
  if (!_.isPlainObject(caps)) {
    return false;
  }

  const isFirstMatchValid = () => _.isArray(caps.firstMatch)
    && !_.isEmpty(caps.firstMatch) && _.every(caps.firstMatch, _.isPlainObject);
  const isAlwaysMatchValid = () => _.isPlainObject(caps.alwaysMatch);
  if (_.has(caps, 'firstMatch') && _.has(caps, 'alwaysMatch')) {
    return isFirstMatchValid() && isAlwaysMatchValid();
  }
  if (_.has(caps, 'firstMatch')) {
    return isFirstMatchValid();
  }
  if (_.has(caps, 'alwaysMatch')) {
    return isAlwaysMatchValid();
  }
  return false;
}

export {
  isW3cCaps,
};