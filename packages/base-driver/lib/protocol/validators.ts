import {util} from '@appium/support';

const MAX_URL_ERROR_LENGTH = 100;

export const validators = {
  setUrl: (url: any) => {
    if (!URL.canParse(url)) {
      throw new Error(`'${util.truncateString(String(url), {length: MAX_URL_ERROR_LENGTH})}' must be a valid URL`);
    }
  },
  setNetworkConnection: (type: any) => {
    if (!isNumber(type) || [0, 1, 2, 4, 6].indexOf(type) === -1) {
      throw new Error('Network type must be one of 0, 1, 2, 4, 6');
    }
  },
};

function isNumber(o: any): o is number {
  return typeof o === 'number' || !Number.isNaN(parseInt(o, 10)) || !Number.isNaN(parseFloat(o));
}
