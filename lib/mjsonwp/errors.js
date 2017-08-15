import ES6Error from 'es6-error';
import _ from 'lodash';
import { util } from 'appium-support';

// base error class for all of our errors
class MJSONWPError extends ES6Error {
  constructor (msg, jsonwpCode) {
    super(msg);
    this.jsonwpCode = jsonwpCode;
  }
}

class NoSuchDriverError extends MJSONWPError {
  static code () {
    return 6;
  }
  constructor (err) {
    super(err || 'A session is either terminated or not started', NoSuchDriverError.code());
  }
}

class NoSuchElementError extends MJSONWPError {
  static code () {
    return 7;
  }
  constructor (err) {
    super(err || 'An element could not be located on the page using the given ' +
          'search parameters.', NoSuchElementError.code());
  }
}

class NoSuchFrameError extends MJSONWPError {
  static code () {
    return 8;
  }
  constructor (err) {
    super(err || 'A request to switch to a frame could not be satisfied because ' +
          'the frame could not be found.', NoSuchFrameError.code());
  }
}

class UnknownCommandError extends MJSONWPError {
  static code () {
    return 9;
  }
  constructor (err) {
    super(err || 'The requested resource could not be found, or a request was ' +
          'received using an HTTP method that is not supported by the mapped ' +
          'resource.', UnknownCommandError.code());
  }
}

class StaleElementReferenceError extends MJSONWPError {
  static code () {
    return 10;
  }
  constructor (err) {
    super(err || 'An element command failed because the referenced element is no ' +
          'longer attached to the DOM.', StaleElementReferenceError.code());
  }
}

class ElementNotVisibleError extends MJSONWPError {
  static code () {
    return 11;
  }
  constructor (err) {
    super(err || 'An element command could not be completed because the element is ' +
          'not visible on the page.', ElementNotVisibleError.code());
  }
}

class InvalidElementStateError extends MJSONWPError {
  static code () {
    return 12;
  }
  constructor (err) {
    super(err || 'An element command could not be completed because the element is ' +
          'in an invalid state (e.g. attempting to click a disabled element).',
          InvalidElementStateError.code());
  }
}

class UnknownError extends MJSONWPError {
  static code () {
    return 13;
  }
  constructor (originalError) {
    let origMessage = originalError;
    if (originalError instanceof Error) {
      origMessage = originalError.message;
    }
    let message = 'An unknown server-side error occurred while processing ' +
                  'the command.';
    if (originalError) {
      message = `${message} Original error: ${origMessage}`;
    }

    super(message, UnknownError.code());
  }
}

class ElementIsNotSelectableError extends MJSONWPError {
  static code () {
    return 15;
  }
  constructor (err) {
    super(err || 'An attempt was made to select an element that cannot be selected.',
          ElementIsNotSelectableError.code());
  }
}

class JavaScriptError extends MJSONWPError {
  static code () {
    return 17;
  }
  constructor (err) {
    super(err || 'An error occurred while executing user supplied JavaScript.',
          JavaScriptError.code());
  }
}

class XPathLookupError extends MJSONWPError {
  static code () {
    return 19;
  }
  constructor (err) {
    super(err || 'An error occurred while searching for an element by XPath.',
          XPathLookupError.code());
  }
}

class TimeoutError extends MJSONWPError {
  static code () {
    return 21;
  }
  constructor (err) {
    super(err || 'An operation did not complete before its timeout expired.',
          TimeoutError.code());
  }
}

class NoSuchWindowError extends MJSONWPError {
  static code () {
    return 23;
  }
  constructor (err) {
    super(err || 'A request to switch to a different window could not be satisfied ' +
          'because the window could not be found.', NoSuchWindowError.code());
  }
}

class InvalidCookieDomainError extends MJSONWPError {
  static code () {
    return 24;
  }
  constructor (err) {
    super(err || 'An illegal attempt was made to set a cookie under a different ' +
          'domain than the current page.', InvalidCookieDomainError.code());
  }
}

class UnableToSetCookieError extends MJSONWPError {
  static code () {
    return 25;
  }
  constructor (err) {
    super(err || 'A request to set a cookie\'s value could not be satisfied.',
          UnableToSetCookieError.code());
  }
}

class UnexpectedAlertOpenError extends MJSONWPError {
  static code () {
    return 26;
  }
  constructor (err) {
    super(err || 'A modal dialog was open, blocking this operation',
          UnexpectedAlertOpenError.code());
  }
}

class NoAlertOpenError extends MJSONWPError {
  static code () {
    return 27;
  }
  constructor (err) {
    super(err || 'An attempt was made to operate on a modal dialog when one ' +
          'was not open.', NoAlertOpenError.code());
  }
}

class ScriptTimeoutError extends MJSONWPError {
  static code () {
    return 28;
  }
  constructor (err) {
    super(err || 'A script did not complete before its timeout expired.',
          ScriptTimeoutError.code());
  }
}

class InvalidElementCoordinatesError extends MJSONWPError {
  static code () {
    return 29;
  }
  constructor (err) {
    super(err || 'The coordinates provided to an interactions operation are invalid.',
          InvalidElementCoordinatesError.code());
  }
}

class IMENotAvailableError extends MJSONWPError {
  static code () {
    return 30;
  }
  constructor (err) {
    super(err || 'IME was not available.', IMENotAvailableError.code());
  }
}

class IMEEngineActivationFailedError extends MJSONWPError {
  static code () {
    return 31;
  }
  constructor (err) {
    super(err || 'An IME engine could not be started.',
          IMEEngineActivationFailedError.code());
  }
}

class InvalidSelectorError extends MJSONWPError {
  static code () {
    return 32;
  }
  constructor (err) {
    super(err || 'Argument was an invalid selector (e.g. XPath/CSS).',
          InvalidSelectorError.code());
  }
}

class SessionNotCreatedError extends MJSONWPError {
  static code () {
    return 33;
  }
  constructor (details) {
    let message = 'A new session could not be created.';
    if (details) {
      message += ` Details: ${details}`;
    }

    super(message, SessionNotCreatedError.code());
  }
}

class MoveTargetOutOfBoundsError extends MJSONWPError {
  static code () {
    return 34;
  }
  constructor (err) {
    super(err || 'Target provided for a move action is out of bounds.',
          MoveTargetOutOfBoundsError.code());
  }
}

class NoSuchContextError extends MJSONWPError {
  static code () {
    return 35;
  }
  constructor (err) {
    super(err || 'No such context found.', NoSuchContextError.code());
  }
}

class InvalidContextError extends MJSONWPError {
  static code () {
    return 36;
  }
  constructor (err) {
    super(err || 'That command could not be executed in the current context.',
          InvalidContextError.code());
  }
}

class NotYetImplementedError extends MJSONWPError {
  static code () {
    return 13;
  }
  constructor (err) {
    super(err || 'Method has not yet been implemented', NotYetImplementedError.code());
  }
}

class NotImplementedError extends MJSONWPError {
  static code () {
    return 13;
  }
  constructor (err) {
    super(err || 'Method is not implemented', NotImplementedError.code());
  }
}

class BadParametersError extends ES6Error {
  constructor (requiredParams, actualParams, errMessage) {
    let message;
    if (!errMessage) {
      message = `Parameters were incorrect. We wanted ` +
          `${JSON.stringify(requiredParams)} and you ` +
          `sent ${JSON.stringify(actualParams)}`;
    } else {
      message = `Parameters were incorrect. You sent ${JSON.stringify(actualParams)}, ${errMessage}`;
    }
    super(message);
  }
}

/**
 * ProxyRequestError is a custom error and will be thrown up on unsuccessful proxy request and
 * will contain information about the proxy failure.
 * In case of ProxyRequestError should fetch the actual error by calling `getActualError()`
 * for proxy failure to generate the client response.
 */
class ProxyRequestError extends ES6Error {
  constructor (err, jsonwp) {
    let message = `Proxy request unsuccessful. ${util.hasValue(jsonwp) ? jsonwp.value : ''}`;
    super(err || message);
    if (typeof jsonwp === 'string') {
      this.jsonwp = JSON.parse(jsonwp);
    } else {
      this.jsonwp = jsonwp;
    }
  }

  getActualError () {
    if (util.hasValue(this.jsonwp) && util.hasValue(this.jsonwp.status) && util.hasValue(this.jsonwp.value)) {
      //returns actual error cause for request failure based on `jsonwp.status`
      return errorFromCode(this.jsonwp.status, this.jsonwp.value);
    }
    return new UnknownError(this.message);
  }
}
// map of error class name to error class
const errors = {NotYetImplementedError,
                NotImplementedError,
                BadParametersError,
                NoSuchDriverError,
                NoSuchElementError,
                UnknownCommandError,
                StaleElementReferenceError,
                ElementNotVisibleError,
                InvalidElementStateError,
                UnknownError,
                ElementIsNotSelectableError,
                JavaScriptError,
                XPathLookupError,
                TimeoutError,
                NoSuchWindowError,
                InvalidCookieDomainError,
                UnableToSetCookieError,
                UnexpectedAlertOpenError,
                NoAlertOpenError,
                ScriptTimeoutError,
                InvalidElementCoordinatesError,
                IMENotAvailableError,
                IMEEngineActivationFailedError,
                InvalidSelectorError,
                SessionNotCreatedError,
                MoveTargetOutOfBoundsError,
                NoSuchContextError,
                InvalidContextError,
                NoSuchFrameError,
                ProxyRequestError};

// map of error code to error class
const errorCodeMap = {};
for (let ErrorClass of _.values(errors)) {
  if (ErrorClass.code) {
    errorCodeMap[ErrorClass.code()] = ErrorClass;
  }
}

function isErrorType (err, type) {
  // `name` property is the constructor name
  if (type.name === MJSONWPError.name) {
    // `jsonwpCode` is `0` on success
    return !!err.jsonwpCode;
  } else if (type.name === ProxyRequestError.name) {
    // `status` is `0` on success
    let hasJsonwpObj = !!err.jsonwp;
    if (hasJsonwpObj) {
      return !!err.jsonwp.status;
    } else {
      return false;
    }
  }
  return err.constructor.name === type.name;
}

// retrieve an error with the code and message
function errorFromCode (code, message) {
  if (code !== 13 && errorCodeMap[code]) {
    return new errorCodeMap[code](message);
  }
  return new UnknownError(message);
}

export { MJSONWPError, errors, isErrorType, errorFromCode };
