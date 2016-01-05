import _ from 'lodash';
import log from './logger';


function fixCaps (originalCaps) {
  let caps = _.clone(originalCaps);
  // boolean capabilities can be passed in as strings 'false' and 'true'
  // which we want to translate into boolean values
  for (let [cap, value] of _.pairs(caps)) {
    if (_.isString(value)) {
      value = value.toLowerCase();
      if (value === 'true' || value === 'false') {
        log.debug(`Capability '${cap}' changed from string to boolean. This may cause unexpected behavior`);
        caps[cap] = (value === 'true');
      }
    }
  }
  return caps;
}


export { fixCaps };
