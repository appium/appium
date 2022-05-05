import {errors} from '../protocol';

function produceError() {
  throw new errors.UnknownCommandError('Produced generic error for testing');
}

function produceCrash() {
  throw new Error('We just tried to crash Appium!');
}

export {produceError, produceCrash};
