import { errors, errorFromCode } from '../..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';

chai.use(chaiAsPromised);

// Error codes and messages have been added according to JsonWireProtocol see
// https://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
let errorsList = [
  {errorName: 'NoSuchDriverError',
   errorMsg: 'A session is either terminated or not started',
   errorCode: 6},
  {errorName: 'NoSuchElementError',
   errorMsg: 'An element could not be located on the page using the ' +
             'given search parameters.',
   errorCode: 7},
  {errorName: 'NoSuchFrameError',
   errorMsg: 'A request to switch to a frame could not be satisfied ' +
             'because the frame could not be found.',
   errorCode: 8},
  {errorName: 'UnknownCommandError',
   errorMsg: 'The requested resource could not be found, or a request ' +
             'was received using an HTTP method that is not supported by ' +
             'the mapped resource.',
   errorCode: 9},
  {errorName: 'StaleElementReferenceError',
   errorMsg: 'An element command failed because the referenced element is ' +
             'no longer attached to the DOM.',
   errorCode: 10},
  {errorName: 'ElementNotVisibleError',
   errorMsg: 'An element command could not be completed because the ' +
             'element is not visible on the page.',
   errorCode: 11},
  {errorName: 'InvalidElementStateError',
   errorMsg: 'An element command could not be completed because the element ' +
             'is in an invalid state (e.g. attempting to click a disabled ' +
             'element).',
   errorCode: 12},
  {errorName: 'UnknownError',
   errorMsg: 'An unknown server-side error occurred while processing the ' +
             'command.',
   errorCode: 13},
  {errorName: 'ElementIsNotSelectableError',
   errorMsg: 'An attempt was made to select an element that cannot ' +
             'be selected.',
   errorCode: 15},
  {errorName: 'JavaScriptError',
   errorMsg: 'An error occurred while executing user supplied JavaScript.',
   errorCode: 17},
  {errorName: 'XPathLookupError',
   errorMsg: 'An error occurred while searching for an element by XPath.',
   errorCode: 19},
  {errorName: 'TimeoutError',
   errorMsg: 'An operation did not complete before its timeout expired.',
   errorCode: 21},
  {errorName: 'NoSuchWindowError',
   errorMsg: 'A request to switch to a different window could not be ' +
             'satisfied because the window could not be found.',
   errorCode: 23},
  {errorName: 'InvalidCookieDomainError',
   errorMsg: 'An illegal attempt was made to set a cookie under a different ' +
             'domain than the current page.',
   errorCode: 24},
  {errorName: 'UnableToSetCookieError',
   errorMsg: `A request to set a cookie's value could not be satisfied.`,
   errorCode: 25},
  {errorName: 'UnexpectedAlertOpenError',
   errorMsg: 'A modal dialog was open, blocking this operation',
   errorCode: 26},
  {errorName: 'NoAlertOpenError',
   errorMsg: 'An attempt was made to operate on a modal dialog when one was ' +
             'not open.',
   errorCode: 27},
  {errorName: 'ScriptTimeoutError',
   errorMsg: 'A script did not complete before its timeout expired.',
   errorCode: 28},
  {errorName: 'InvalidElementCoordinatesError',
   errorMsg: 'The coordinates provided to an interactions operation are ' +
             'invalid.',
   errorCode: 29},
  {errorName: 'IMENotAvailableError',
   errorMsg: 'IME was not available.',
   errorCode: 30},
  {errorName: 'IMEEngineActivationFailedError',
   errorMsg: 'An IME engine could not be started.',
   errorCode: 31},
  {errorName: 'InvalidSelectorError',
   errorMsg: 'Argument was an invalid selector (e.g. XPath/CSS).',
   errorCode: 32},
  {errorName: 'SessionNotCreatedError',
   errorMsg: 'A new session could not be created.',
   errorCode: 33},
  {errorName: 'MoveTargetOutOfBoundsError',
   errorMsg: 'Target provided for a move action is out of bounds.',
   errorCode: 34},
  {errorName: 'NotYetImplementedError',
   errorMsg: 'Method has not yet been implemented',
   errorCode: 13}
];

describe('errors', () => {
  for (let error of errorsList) {
    it(error.errorName + ' should have correct code and messg', () => {
      new errors[error.errorName]()
        .should.have.property('jsonwpCode', error.errorCode);
      new errors[error.errorName]()
        .should.have.property('message', error.errorMsg);
    });
  }
  it('BadParametersError should not have code and should have messg', () => {
    new errors.BadParametersError()
      .should.not.have.property('jsonwpCode');
    new errors.BadParametersError()
      .should.have.property('message');
  });
  it('ProxyRequestError should have message and jsonwp', () => {
    new errors.ProxyRequestError()
        .should.have.property('jsonwp');
    new errors.ProxyRequestError()
        .should.have.property('message');
  });
});
describe('errorFromCode', () => {
  for (let error of errorsList) {
    if (error.errorName !== 'NotYetImplementedError') {
      it(error.errorCode + ' should return correct error', () => {
        errorFromCode(error.errorCode)
          .should.have.property('jsonwpCode', error.errorCode);
        errorFromCode(error.errorCode)
          .should.have.property('message', error.errorMsg);
        if (!_.includes([13, 33], error.errorCode)) {
          errorFromCode(error.errorCode, 'abcd')
            .should.have.property('jsonwpCode', error.errorCode);
          errorFromCode(error.errorCode, 'abcd')
            .should.have.property('message', 'abcd');
        }
      });
    }
  }
  it('should throw unknown error for unknown code', () => {
    errorFromCode(99)
      .should.have.property('jsonwpCode', 13);
    errorFromCode(99)
      .should.have.property('message', 'An unknown server-side error occurred ' +
                                       'while processing the command.');
  });
});
