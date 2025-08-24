import { errors, errorFromW3CJsonCode, isErrorType } from '../../../lib';
import { BadParametersError, getResponseForW3CError } from '../../../lib/protocol/errors';
import _ from 'lodash';
import { StatusCodes as HTTPStatusCodes } from 'http-status-codes';
import path from 'path';

const basename = path.basename(__filename);

// Error codes and messages have been added according to JsonWireProtocol see
// https://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
let errorsList = [
  {
    errorName: 'NoSuchDriverError',
    errorMsg: 'A session is either terminated or not started',
    error: 'invalid session id',
  },
  {
    errorName: 'ElementClickInterceptedError',
    errorMsg:
      'The Element Click command could not be completed because the element receiving the events is obscuring the element that was requested clicked',
    error: 'element click intercepted',
  },
  {
    errorName: 'ElementNotInteractableError',
    errorMsg:
      'A command could not be completed because the element is not pointer- or keyboard interactable',
    error: 'element not interactable',
  },
  {
    errorName: 'InsecureCertificateError',
    errorMsg:
      'Navigation caused the user agent to hit a certificate warning, which is usually the result of an expired or invalid TLS certificate',
    error: 'insecure certificate',
  },
  {
    errorName: 'InvalidArgumentError',
    errorMsg: 'The arguments passed to the command are either invalid or malformed',
    error: 'invalid argument',
  },
  {
    errorName: 'NoSuchElementError',
    errorMsg: 'An element could not be located on the page using the ' + 'given search parameters.',
    error: 'no such element',
  },
  {
    errorName: 'NoSuchFrameError',
    errorMsg:
      'A request to switch to a frame could not be satisfied ' +
      'because the frame could not be found.',
    error: 'no such frame',
  },
  {
    errorName: 'UnknownCommandError',
    errorMsg:
      'The requested resource could not be found, or a request ' +
      'was received using an HTTP method that is not supported by ' +
      'the mapped resource.',
    error: 'unknown command',
  },
  {
    errorName: 'StaleElementReferenceError',
    errorMsg:
      'An element command failed because the referenced element is ' +
      'no longer attached to the DOM.',
    error: 'stale element reference',
  },
  {
    errorName: 'ElementNotVisibleError',
    errorMsg:
      'An element command could not be completed because the ' +
      'element is not visible on the page.',
    error: 'element not visible',
  },
  {
    errorName: 'InvalidElementStateError',
    errorMsg:
      'An element command could not be completed because the element ' +
      'is in an invalid state (e.g. attempting to click a disabled ' +
      'element).',
    error: 'invalid element state',
  },
  {
    errorName: 'UnknownError',
    errorMsg: 'An unknown server-side error occurred while processing the ' + 'command.',
    error: 'unknown error',
  },
  {
    errorName: 'ElementIsNotSelectableError',
    errorMsg: 'An attempt was made to select an element that cannot ' + 'be selected.',
    error: 'element not selectable',
  },
  {
    errorName: 'JavaScriptError',
    errorMsg: 'An error occurred while executing user supplied JavaScript.',
    error: 'javascript error',
  },
  {
    errorName: 'XPathLookupError',
    errorMsg: 'An error occurred while searching for an element by XPath.',
    error: 'invalid selector',
  },
  {
    errorName: 'TimeoutError',
    errorMsg: 'An operation did not complete before its timeout expired.',
    error: 'timeout',
  },
  {
    errorName: 'NoSuchWindowError',
    errorMsg:
      'A request to switch to a different window could not be ' +
      'satisfied because the window could not be found.',
    error: 'no such window',
  },
  {
    errorName: 'InvalidCookieDomainError',
    errorMsg:
      'An illegal attempt was made to set a cookie under a different ' +
      'domain than the current page.',
    error: 'invalid cookie domain',
  },
  {
    errorName: 'InvalidCoordinatesError',
    errorMsg: 'The coordinates provided to an interactions operation are invalid.',
    error: 'invalid coordinates',
  },
  {
    errorName: 'UnableToSetCookieError',
    errorMsg: `A request to set a cookie's value could not be satisfied.`,
    error: 'unable to set cookie',
  },
  {
    errorName: 'UnexpectedAlertOpenError',
    errorMsg: 'A modal dialog was open, blocking this operation',
    error: 'unexpected alert open',
  },
  {
    errorName: 'NoAlertOpenError',
    errorMsg: 'An attempt was made to operate on a modal dialog when one was ' + 'not open.',
    error: 'no such alert',
  },
  {
    errorName: 'ScriptTimeoutError',
    errorMsg: 'A script did not complete before its timeout expired.',
    error: 'script timeout',
  },
  {
    errorName: 'InvalidElementCoordinatesError',
    errorMsg: 'The coordinates provided to an interactions operation are ' + 'invalid.',
    error: 'unsupported operation',
  },
  {
    errorName: 'IMENotAvailableError',
    errorMsg: 'IME was not available.',
    error: 'unsupported operation',
  },
  {
    errorName: 'IMEEngineActivationFailedError',
    errorMsg: 'An IME engine could not be started.',
    error: 'unsupported operation',
  },
  {
    errorName: 'InvalidSelectorError',
    errorMsg: 'Argument was an invalid selector (e.g. XPath/CSS).',
    error: 'invalid selector',
  },
  {
    errorName: 'SessionNotCreatedError',
    errorMsg: 'A new session could not be created.',
    error: 'session not created',
  },
  {
    errorName: 'MoveTargetOutOfBoundsError',
    errorMsg: 'Target provided for a move action is out of bounds.',
    error: 'move target out of bounds',
  },
  {
    errorName: 'NoSuchAlertError',
    errorMsg: 'An attempt was made to operate on a modal dialog when one was not open.',
    error: 'no such alert',
  },
  {
    errorName: 'NoSuchCookieError',
    errorMsg:
      'No cookie matching the given path name was found amongst the associated cookies of the current browsing context’s active document',
    error: 'no such cookie',
  },
  {
    errorName: 'NotYetImplementedError',
    errorMsg: 'Method has not yet been implemented',
    error: 'unknown method',
  },
  {
    errorName: 'UnknownCommandError',
    errorMsg:
      'The requested resource could not be found, or a request was received using an HTTP method that is not supported by the mapped resource.',
    error: 'unknown command',
  },
  {
    errorName: 'UnknownMethodError',
    errorMsg: 'The requested command matched a known URL but did not match an method for that URL',
    error: 'unknown method',
  },
  {
    errorName: 'UnsupportedOperationError',
    errorMsg: 'A server-side error occurred. Command cannot be supported.',
    error: 'unsupported operation',
  },
];

describe('errors', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  for (let error of errorsList) {
    it(error.errorName + ' should have a W3C code and message', function () {
      new errors[error.errorName]().should.have.property('error', error.error);
      new errors[error.errorName]().should.have.property('message', error.errorMsg);
    });
  }
});

describe('errorFromW3CJsonCode', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  for (let error of errorsList) {
    if (error.errorName !== 'NotYetImplementedError') {
      it(error.errorName + ' should return correct error', function () {
        const { error: w3cError } = error;
        if (w3cError) {
          errorFromW3CJsonCode(w3cError).error.should.equal(error.error);
          errorFromW3CJsonCode(w3cError).should.have.property('message', error.errorMsg);
        } else {
          isErrorType(errorFromW3CJsonCode(w3cError), errors.UnknownError).should.be.true;
        }
      });
    }
  }
  it('should parse unknown errors', function () {
    isErrorType(errorFromW3CJsonCode('not a real error code'), errors.UnknownError).should.be.true;
    errorFromW3CJsonCode('not a real error code').message.should.match(
      /An unknown server-side error occurred/
    );
    errorFromW3CJsonCode('not a real error code').error.should.equal('unknown error');
  });
});
describe('w3c Status Codes', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  it('should match the correct error codes', function () {
    let non400Errors = [
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

    // Test the errors that we don't expect to return 400 code
    for (let [errorName, expectedErrorCode] of non400Errors) {
      errors[errorName].should.exist;
      new errors[errorName]().should.have.property('w3cStatus', expectedErrorCode);
    }

    // Test an error that we expect to return 400 code
    new errors.ElementClickInterceptedError().should.have.property('w3cStatus', 400);
  });
});
describe('.getResponseForW3CError', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  it('should return an error, message and stacktrace for just a generic exception', function () {
    try {
      throw new Error('Some random error');
    } catch (e) {
      const [httpStatus, httpResponseBody] = getResponseForW3CError(e);
      httpStatus.should.equal(500);
      const { error, message, stacktrace } = httpResponseBody.value;
      message.should.match(/Some random error/);
      error.should.equal('unknown error');
      stacktrace.should.match(/caused by/);
      stacktrace.should.match(/Some random error/);
      stacktrace.should.contain(basename);
    }
  });
  it('should return an error, message and stacktrace for a NoSuchElementError', function () {
    const noSuchElementError = new errors.NoSuchElementError('specific error message');
    const [httpStatus, httpResponseBody] = getResponseForW3CError(noSuchElementError);
    httpStatus.should.equal(404);
    const { error, message, stacktrace } = httpResponseBody.value;
    error.should.equal('no such element');
    message.should.match(/specific error message/);
    stacktrace.should.contain(basename);
  });
  it('should handle BadParametersError', function () {
    const badParamsError = new BadParametersError({
      required: ['foo'],
    }, ['bar']);
    const [httpStatus, httpResponseBody] = getResponseForW3CError(badParamsError);
    httpStatus.should.equal(400);
    const { error, message, stacktrace } = httpResponseBody.value;
    error.should.equal('invalid argument');
    message.should.match(/foo/);
    message.should.match(/bar/);
    stacktrace.should.contain(basename);
  });
});
describe('.getActualError', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
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
      isErrorType(actualError, errors.NoSuchElementError).should.be.true;
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
      isErrorType(actualError, errors.StaleElementReferenceError).should.be.true;
    });
    it('should map an unknown error to UnknownError', function () {
      const actualError = new errors.ProxyRequestError(
        'Error message does not matter',
        null,
        {
          value: {
            error: 'Not a valid w3c JSON code',
          },
        },
        456
      ).getActualError();
      isErrorType(actualError, errors.UnknownError).should.be.true;
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
      isErrorType(actualError, errors.StaleElementReferenceError).should.be.true;
    });
  });
});
