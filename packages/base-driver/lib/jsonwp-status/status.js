import _ from 'lodash';

const codes = {
  Success: {
    code: 0,
    summary: 'The command executed successfully.',
  },
  NoSuchDriver: {
    code: 6,
    summary: 'A session is either terminated or not started',
  },
  NoSuchElement: {
    code: 7,
    summary: 'An element could not be located on the page using the given search parameters.',
  },
  NoSuchFrame: {
    code: 8,
    summary:
      'A request to switch to a frame could not be satisfied because the frame could not be found.',
  },
  UnknownCommand: {
    code: 9,
    summary:
      'The requested resource could not be found, or a request was received using an HTTP method that is not supported by the mapped resource.',
  },
  StaleElementReference: {
    code: 10,
    summary:
      'An element command failed because the referenced element is no longer attached to the DOM.',
  },
  ElementNotVisible: {
    code: 11,
    summary:
      'An element command could not be completed because the element is not visible on the page.',
  },
  InvalidElementState: {
    code: 12,
    summary:
      'An element command could not be completed because the element is in an invalid state (e.g. attempting to click a disabled element).',
  },
  UnknownError: {
    code: 13,
    summary: 'An unknown server-side error occurred while processing the command.',
  },
  ElementIsNotSelectable: {
    code: 15,
    summary: 'An attempt was made to select an element that cannot be selected.',
  },
  JavaScriptError: {
    code: 17,
    summary: 'An error occurred while executing user supplied JavaScript.',
  },
  XPathLookupError: {
    code: 19,
    summary: 'An error occurred while searching for an element by XPath.',
  },
  Timeout: {
    code: 21,
    summary: 'An operation did not complete before its timeout expired.',
  },
  NoSuchWindow: {
    code: 23,
    summary:
      'A request to switch to a different window could not be satisfied because the window could not be found.',
  },
  InvalidCookieDomain: {
    code: 24,
    summary:
      'An illegal attempt was made to set a cookie under a different domain than the current page.',
  },
  UnableToSetCookie: {
    code: 25,
    summary: "A request to set a cookie's value could not be satisfied.",
  },
  UnexpectedAlertOpen: {
    code: 26,
    summary: 'A modal dialog was open, blocking this operation',
  },
  NoAlertOpenError: {
    code: 27,
    summary: 'An attempt was made to operate on a modal dialog when one was not open.',
  },
  ScriptTimeout: {
    code: 28,
    summary: 'A script did not complete before its timeout expired.',
  },
  InvalidElementCoordinates: {
    code: 29,
    summary: 'The coordinates provided to an interactions operation are invalid.',
  },
  IMENotAvailable: {
    code: 30,
    summary: 'IME was not available.',
  },
  IMEEngineActivationFailed: {
    code: 31,
    summary: 'An IME engine could not be started.',
  },
  InvalidSelector: {
    code: 32,
    summary: 'Argument was an invalid selector (e.g. XPath/CSS).',
  },
  SessionNotCreatedException: {
    code: 33,
    summary: 'A new session could not be created.',
  },
  MoveTargetOutOfBounds: {
    code: 34,
    summary: 'Target provided for a move action is out of bounds.',
  },
  NoSuchContext: {
    code: 35,
    summary: 'No such context found.',
  },
};

function getSummaryByCode(code) {
  code = parseInt(code, 10);
  for (let obj of _.values(codes)) {
    if (!_.isUndefined(obj.code) && obj.code === code) {
      return obj.summary;
    }
  }
  return 'An error occurred';
}

export default codes;
export {codes, getSummaryByCode};
