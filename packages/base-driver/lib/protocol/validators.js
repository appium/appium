import _ from 'lodash';

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
