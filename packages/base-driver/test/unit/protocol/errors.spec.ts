import {expect} from 'chai';
import {errors, errorFromMJSONWPStatusCode, errorFromW3CJsonCode, isErrorType} from '../../../lib';
import {BadParametersError, getResponseForW3CError} from '../../../lib/protocol/errors';
import _ from 'lodash';
import {StatusCodes as HTTPStatusCodes} from 'http-status-codes';
import path from 'node:path';

const basename = path.basename(__filename);

interface ErrorListItem {
  errorName: string;
  errorMsg: string;
  error?: string;
  errorCode?: number;
}

const errorsList: ErrorListItem[] = [
  {errorName: 'NoSuchDriverError', errorMsg: 'A session is either terminated or not started', error: 'invalid session id', errorCode: 6},
  {errorName: 'ElementClickInterceptedError', errorMsg: 'The Element Click command could not be completed because the element receiving the events is obscuring the element that was requested clicked', error: 'element click intercepted'},
  {errorName: 'ElementNotInteractableError', errorMsg: 'A command could not be completed because the element is not pointer- or keyboard interactable', error: 'element not interactable'},
  {errorName: 'InsecureCertificateError', errorMsg: 'Navigation caused the user agent to hit a certificate warning, which is usually the result of an expired or invalid TLS certificate', error: 'insecure certificate'},
  {errorName: 'InvalidArgumentError', errorMsg: 'The arguments passed to the command are either invalid or malformed', error: 'invalid argument'},
  {errorName: 'NoSuchElementError', errorMsg: 'An element could not be located on the page using the given search parameters.', error: 'no such element', errorCode: 7},
  {errorName: 'NoSuchFrameError', errorMsg: 'A request to switch to a frame could not be satisfied because the frame could not be found.', error: 'no such frame', errorCode: 8},
  {errorName: 'UnknownCommandError', errorMsg: 'The requested resource could not be found, or a request was received using an HTTP method that is not supported by the mapped resource.', error: 'unknown command', errorCode: 9},
  {errorName: 'StaleElementReferenceError', errorMsg: 'An element command failed because the referenced element is no longer attached to the DOM.', error: 'stale element reference', errorCode: 10},
  {errorName: 'ElementNotVisibleError', errorMsg: 'An element command could not be completed because the element is not visible on the page.', errorCode: 11},
  {errorName: 'InvalidElementStateError', errorMsg: 'An element command could not be completed because the element is in an invalid state (e.g. attempting to click a disabled element).', error: 'invalid element state', errorCode: 12},
  {errorName: 'UnknownError', errorMsg: 'An unknown server-side error occurred while processing the command.', error: 'unknown error', errorCode: 13},
  {errorName: 'ElementIsNotSelectableError', errorMsg: 'An attempt was made to select an element that cannot be selected.', error: 'element not selectable', errorCode: 15},
  {errorName: 'JavaScriptError', errorMsg: 'An error occurred while executing user supplied JavaScript.', error: 'javascript error', errorCode: 17},
  {errorName: 'XPathLookupError', errorMsg: 'An error occurred while searching for an element by XPath.', errorCode: 19},
  {errorName: 'TimeoutError', errorMsg: 'An operation did not complete before its timeout expired.', error: 'timeout', errorCode: 21},
  {errorName: 'NoSuchWindowError', errorMsg: 'A request to switch to a different window could not be satisfied because the window could not be found.', error: 'no such window', errorCode: 23},
  {errorName: 'InvalidCookieDomainError', errorMsg: 'An illegal attempt was made to set a cookie under a different domain than the current page.', error: 'invalid cookie domain', errorCode: 24},
  {errorName: 'InvalidCoordinatesError', errorMsg: 'The coordinates provided to an interactions operation are invalid.', error: 'invalid coordinates'},
  {errorName: 'UnableToSetCookieError', errorMsg: `A request to set a cookie's value could not be satisfied.`, error: 'unable to set cookie', errorCode: 25},
  {errorName: 'UnexpectedAlertOpenError', errorMsg: 'A modal dialog was open, blocking this operation', error: 'unexpected alert open', errorCode: 26},
  {errorName: 'NoAlertOpenError', errorMsg: 'An attempt was made to operate on a modal dialog when one was not open.', errorCode: 27},
  {errorName: 'ScriptTimeoutError', errorMsg: 'A script did not complete before its timeout expired.', error: 'script timeout', errorCode: 28},
  {errorName: 'InvalidElementCoordinatesError', errorMsg: 'The coordinates provided to an interactions operation are invalid.', errorCode: 29},
  {errorName: 'IMENotAvailableError', errorMsg: 'IME was not available.', errorCode: 30},
  {errorName: 'IMEEngineActivationFailedError', errorMsg: 'An IME engine could not be started.', errorCode: 31},
  {errorName: 'InvalidSelectorError', errorMsg: 'Argument was an invalid selector (e.g. XPath/CSS).', error: 'invalid selector', errorCode: 32},
  {errorName: 'SessionNotCreatedError', errorMsg: 'A new session could not be created.', error: 'session not created', errorCode: 33},
  {errorName: 'MoveTargetOutOfBoundsError', errorMsg: 'Target provided for a move action is out of bounds.', error: 'move target out of bounds', errorCode: 34},
  {errorName: 'NoSuchAlertError', errorMsg: 'An attempt was made to operate on a modal dialog when one was not open.', error: 'no such alert'},
  {errorName: 'NoSuchCookieError', errorMsg: 'No cookie matching the given path name was found amongst the associated cookies of the current browsing context\u2019s active document', error: 'no such cookie'},
  {errorName: 'NotYetImplementedError', errorMsg: 'Method has not yet been implemented', error: 'unknown method', errorCode: 405},
  {errorName: 'UnknownCommandError', errorMsg: 'The requested resource could not be found, or a request was received using an HTTP method that is not supported by the mapped resource.', error: 'unknown command'},
  {errorName: 'UnknownMethodError', errorMsg: 'The requested command matched a known URL but did not match an method for that URL', error: 'unknown method'},
  {errorName: 'UnsupportedOperationError', errorMsg: 'A server-side error occurred. Command cannot be supported.', error: 'unsupported operation'},
];

describe('errors', function () {
  for (const error of errorsList) {
    it(error.errorName + ' should have a JSONWP code or W3C code and message', function () {
      const ErrClass = (errors as any)[error.errorName];
      const errInstance = new ErrClass();
      if (error.errorCode) {
        expect(errInstance).to.have.property('jsonwpCode', error.errorCode);
      } else {
        expect(errInstance).to.have.property('error', error.error);
      }
      expect(errInstance).to.have.property('message', error.errorMsg);
    });
  }
});

describe('errorFromMJSONWPStatusCode', function () {
  for (const error of errorsList) {
    if (error.errorName !== 'NotYetImplementedError') {
      it((error.errorCode ?? error.errorName) + ' should return correct error', function () {
        if (error.errorCode) {
          expect(errorFromMJSONWPStatusCode(error.errorCode)).to.have.property('jsonwpCode', error.errorCode);
          expect(errorFromMJSONWPStatusCode(error.errorCode)).to.have.property('message', error.errorMsg);
          if (!_.includes([13, 33], error.errorCode)) {
            expect(errorFromMJSONWPStatusCode(error.errorCode, 'abcd')).to.have.property('jsonwpCode', error.errorCode);
            expect(errorFromMJSONWPStatusCode(error.errorCode, 'abcd')).to.have.property('message', 'abcd');
          }
        } else {
          expect(isErrorType(errorFromMJSONWPStatusCode((error as any).errorCode), errors.UnknownError)).to.be.true;
        }
      });
    }
  }
  it('should throw unknown error for unknown code', function () {
    expect(errorFromMJSONWPStatusCode(99)).to.have.property('jsonwpCode', 13);
    expect(errorFromMJSONWPStatusCode(99)).to.have.property('message', 'An unknown server-side error occurred while processing the command.');
  });
});

describe('errorFromW3CJsonCode', function () {
  for (const error of errorsList) {
    if (error.errorName !== 'NotYetImplementedError') {
      it(error.errorName + ' should return correct error', function () {
        const w3cError = error.error;
        if (w3cError) {
          const err = errorFromW3CJsonCode(w3cError, error.errorMsg);
          expect(err.error).to.equal(error.error);
          if (error.errorName === 'SessionNotCreatedError') {
            expect(err.message).to.include(error.errorMsg);
          } else {
            expect(err).to.have.property('message', error.errorMsg);
          }
        } else {
          expect(isErrorType(errorFromW3CJsonCode(error.error ?? 'unknown error', error.errorMsg), errors.UnknownError)).to.be.true;
        }
      });
    }
  }
  it('should parse unknown errors', function () {
    const msg = 'An unknown server-side error occurred while processing the command.';
    expect(isErrorType(errorFromW3CJsonCode('not a real error code', msg), errors.UnknownError)).to.be.true;
    expect(errorFromW3CJsonCode('not a real error code', msg).message).to.match(/An unknown server-side error occurred/);
    expect(errorFromW3CJsonCode('not a real error code', msg).error).to.equal('unknown error');
  });
});

describe('w3c Status Codes', function () {
  it('should match the correct error codes', function () {
    const non400Errors: [string, number][] = [
      ['NoSuchDriverError', 404],
      ['NoSuchFrameError', 404],
      ['NoAlertOpenError', 404],
      ['NoSuchWindowError', 404],
      ['StaleElementReferenceError', 404],
      ['JavaScriptError', 500],
      ['MoveTargetOutOfBoundsError', 500],
      ['NoSuchCookieError', 404],
      ['NoSuchElementError', 404],
      ['ScriptTimeoutError', 408],
      ['SessionNotCreatedError', 500],
      ['TimeoutError', 408],
      ['UnableToSetCookieError', 500],
      ['UnableToCaptureScreen', 500],
      ['UnexpectedAlertOpenError', 500],
      ['UnknownCommandError', 404],
      ['UnknownError', 500],
      ['UnknownMethodError', 405],
      ['UnsupportedOperationError', 500],
    ];

    for (const [errorName, expectedErrorCode] of non400Errors) {
      expect((errors as any)[errorName]).to.exist;
      expect(new (errors as any)[errorName]()).to.have.property('w3cStatus', expectedErrorCode);
    }
    expect(new errors.ElementClickInterceptedError()).to.have.property('w3cStatus', 400);
  });
});

describe('.getResponseForW3CError', function () {
  it('should return an error, message and stacktrace for just a generic exception', function () {
    try {
      throw new Error('Some random error');
    } catch (e) {
      const [httpStatus, httpResponseBody] = getResponseForW3CError(e as Error);
      expect(httpStatus).to.equal(500);
      const {error, message, stacktrace} = httpResponseBody.value;
      expect(message).to.match(/Some random error/);
      expect(error).to.equal('unknown error');
      expect(stacktrace).to.match(/caused by/);
      expect(stacktrace).to.match(/Some random error/);
      expect(stacktrace).to.contain(basename);
    }
  });
  it('should return an error, message and stacktrace for a NoSuchElementError', function () {
    const noSuchElementError = new errors.NoSuchElementError('specific error message');
    const [httpStatus, httpResponseBody] = getResponseForW3CError(noSuchElementError);
    expect(httpStatus).to.equal(404);
    const {error, message, stacktrace} = httpResponseBody.value;
    expect(error).to.equal('no such element');
    expect(message).to.match(/specific error message/);
    expect(stacktrace).to.contain(basename);
  });
  it('should handle BadParametersError', function () {
    const badParamsError = new BadParametersError({required: ['foo']}, ['bar']);
    const [httpStatus, httpResponseBody] = getResponseForW3CError(badParamsError);
    expect(httpStatus).to.equal(400);
    const {error, message, stacktrace} = httpResponseBody.value;
    expect(error).to.equal('invalid argument');
    expect(message).to.match(/foo/);
    expect(message).to.match(/bar/);
    expect(stacktrace).to.contain(basename);
  });
  it('should translate JSONWP errors', function () {
    const [httpStatus, httpResponseBody] = getResponseForW3CError(
      new errors.NoSuchElementError('My custom message')
    );
    expect(httpStatus).to.equal(404);
    const {error, message, stacktrace} = httpResponseBody.value;
    expect(message).to.equal('My custom message');
    expect(error).to.equal('no such element');
    expect(stacktrace).to.exist;
  });
});

describe('.getActualError', function () {
  describe('MJSONWP', function () {
    it('should map a status code 7 no such element error as a NoSuchElementError', function () {
      const actualError = new errors.ProxyRequestError('Error message does not matter', {
        value: 'does not matter',
        status: 7,
      }).getActualError();
      expect(isErrorType(actualError, errors.NoSuchElementError)).to.be.true;
    });
    it('should map a status code 10, StaleElementReferenceError', function () {
      const actualError = new errors.ProxyRequestError('Error message does not matter', {
        value: 'Does not matter',
        status: 10,
      }).getActualError();
      expect(isErrorType(actualError, errors.StaleElementReferenceError)).to.be.true;
    });
    it('should map an unknown error to UnknownError', function () {
      const actualError = new errors.ProxyRequestError('Error message does not matter', {
        value: 'Does not matter',
        status: -100,
      }).getActualError();
      expect(isErrorType(actualError, errors.UnknownError)).to.be.true;
    });
    it('should parse a JSON string', function () {
      const actualError = new errors.ProxyRequestError(
        'Error message does not matter',
        JSON.stringify({
          value: 'Does not matter',
          status: -100,
        })
      ).getActualError();
      expect(isErrorType(actualError, errors.UnknownError)).to.be.true;
    });
  });

  describe('W3C', function () {
    it('should map a 404 no such element error as a NoSuchElementError', function () {
      const actualError = new errors.ProxyRequestError(
        'Error message does not matter',
        {
          value: {
            error: errors.NoSuchElementError.error(),
          },
        },
        HTTPStatusCodes.NOT_FOUND
      ).getActualError();
      expect(isErrorType(actualError, errors.NoSuchElementError)).to.be.true;
    });
    it('should map a 400 StaleElementReferenceError', function () {
      const actualError = new errors.ProxyRequestError(
        'Error message does not matter',
        {
          value: {
            error: errors.StaleElementReferenceError.error(),
          },
        },
        HTTPStatusCodes.BAD_REQUEST
      ).getActualError();
      expect(isErrorType(actualError, errors.StaleElementReferenceError)).to.be.true;
    });
    it('should map an unknown error to UnknownError', function () {
      const actualError = new errors.ProxyRequestError(
        'Error message does not matter',
        {
          value: {
            error: 'Not a valid w3c JSON code',
          },
        },
        456
      ).getActualError();
      expect(isErrorType(actualError, errors.UnknownError)).to.be.true;
    });
    it('should parse a JSON string', function () {
      const actualError = new errors.ProxyRequestError(
        'Error message does not matter',
        JSON.stringify({
          value: {
            error: errors.StaleElementReferenceError.error(),
          },
        }),
        HTTPStatusCodes.BAD_REQUEST
      ).getActualError();
      expect(isErrorType(actualError, errors.StaleElementReferenceError)).to.be.true;
    });
  });
});
