import _ from 'lodash';
import { util } from 'appium-support';
import BaseDriver from "../basedriver/driver";

function isNumber (o) {
  return _.isNumber(o) || !_.isNaN(parseInt(o, 10)) || !_.isNaN(parseFloat(o));
}

function msValidator (ms) {
  if (!_.isNumber(ms) || ms < 0) {
    throw new Error('Wait ms must be a number equal to 0 or greater');
  }
}

const validators = {
  setUrl: (url) => {
    // either an `xyz://`, `about:`, or `data:` scheme is allowed
    if (!url || !url.match(/^([a-zA-Z0-9_+.-]+:\/\/)|(about:)|(data:)/)) {
      throw new Error('Url or Uri must start with <scheme>://');
    }
  },
  implicitWait: (ms) => {
    msValidator(ms);
  },
  asyncScriptTimeout: (ms) => {
    msValidator(ms);
  },
  timeouts: (timeoutsObj) => {
    if (timeoutsObj.protocol === BaseDriver.DRIVER_PROTOCOL.W3C) {
      const {script, pageLoad, implicit} = timeoutsObj;

      if (util.hasValue(script)) {
        msValidator(script);
      }
      if (util.hasValue(pageLoad)) {
        msValidator(pageLoad);
      }
      if (util.hasValue(implicit)) {
        msValidator(implicit);
      }
    } else {
      const {type, ms} = timeoutsObj;

      msValidator(ms);
      if (!_.includes(['script', 'implicit', 'page load', 'command'], type)) {
        throw new Error(`'${type}' is not a valid timeout type`);
      }
    }
  },
  clickCurrent: (button) => {
    if (!(isNumber(button) || _.isUndefined(button)) || (button < 0 || button > 2)) {
      throw new Error('Click button must be 0, 1, or 2');
    }
  },
  setNetworkConnection: (type) => {
    if (!isNumber(type) || [0, 1, 2, 4, 6].indexOf(type) === -1) {
      throw new Error('Network type must be one of 0, 1, 2, 4, 6');
    }
  }
};

export { validators };
