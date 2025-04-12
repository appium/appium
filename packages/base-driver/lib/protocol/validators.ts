import _ from 'lodash';

export const validators = {
  setUrl: (url: any) => {
    // either an `xyz://`, `about:`, or `data:` scheme is allowed
    if (!url || !url.match(/^([a-zA-Z0-9_+.-]+:\/\/)|(about:)|(data:)/)) {
      throw new Error('Url or Uri must start with <scheme>://');
    }
  },
  setNetworkConnection: (type: any) => {
    if (!isNumber(type) || [0, 1, 2, 4, 6].indexOf(type) === -1) {
      throw new Error('Network type must be one of 0, 1, 2, 4, 6');
    }
  },
};

function isNumber(o: any): o is number {
  return _.isNumber(o) || !_.isNaN(parseInt(o, 10)) || !_.isNaN(parseFloat(o));
}
