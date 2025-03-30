import _ from 'lodash';
import {util, logger} from '@appium/support';
import {StatusCodes as HTTPStatusCodes} from 'http-status-codes';
import type { ErrorBiDiCommandResponse, Class } from '@appium/types';

const mjsonwpLog = logger.getLogger('MJSONWP');
const w3cLog = logger.getLogger('W3C');

class BaseError extends Error {
  public cause: Error | undefined;
  public message: string;
  public name: string;
  public stack: string | undefined;

  constructor(message: string = '', cause?: Error) {
    super(message);
    this.cause = cause;
    this.message = message;
    this.name = this.constructor.name;
    this._formatStack();
  }

  private _formatStack(): void {
    // eslint-disable-next-line no-prototype-builtins
    if (Error.hasOwnProperty('captureStackTrace') && _.isEmpty(this.stack)) {
      Error.captureStackTrace(this, this.constructor);
    }
    if (!_.isString(this.cause?.stack)) {
      return;
    }
    if (_.isEmpty(this.stack)) {
      this.stack = this.cause.stack;
      return;
    }
    const stackLines = this.stack?.split('\n') ?? [];
    stackLines.push('The above error is caused by');
    stackLines.push(...this.cause.stack.split('\n'));
    this.stack = stackLines.join('\n');
  }
}

// base error class for all of our errors
export class ProtocolError extends BaseError {
  protected _stacktrace: string | undefined;
  public jsonwpCode: number;
  public error: string;
  public w3cStatus: number;

  constructor(
    msg: string,
    jsonwpCode: number,
    w3cStatus: number,
    w3cErrorSignature: string,
    cause?: Error,
  ) {
    super(msg, cause);
    this.jsonwpCode = jsonwpCode ?? UnknownError.code();
    this.error = w3cErrorSignature ?? UnknownError.error();
    this.w3cStatus = w3cStatus ?? UnknownError.w3cStatus();
    this._stacktrace = undefined;
  }

  get stacktrace() {
    return this._stacktrace || this.stack;
  }

  set stacktrace(value) {
    this._stacktrace = value;
  }

  /**
   * Get the Bidi protocol version of an error
   * @param id - the id used in the request for which this error forms the response
   * @see https://w3c.github.io/webdriver-bidi/#protocol-definition
   * @returns The object conforming to the shape of a BiDi error response
   */
  bidiErrObject(id: string|number): ErrorBiDiCommandResponse {
    // if we don't have an id, the client didn't send one, so we have nothing to send back.
    // send back zero rather than making something up
    const intId = (_.isInteger(id) ? id : (parseInt(`${id}`, 10) || 0)) as number;
    return {
      id: intId,
      type: 'error',
      error: this.error,
      stacktrace: this.stacktrace,
      message: this.message,
    };
  }
}

// https://github.com/SeleniumHQ/selenium/blob/176b4a9e3082ac1926f2a436eb346760c37a5998/java/client/src/org/openqa/selenium/remote/ErrorCodes.java#L215
// https://github.com/SeleniumHQ/selenium/issues/5562#issuecomment-370379470
// https://w3c.github.io/webdriver/webdriver-spec.html#dfn-error-code

export class NoSuchDriverError extends ProtocolError {
  static code() {
    return 6;
  }
  // W3C Error is called InvalidSessionID
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }
  static error() {
    return 'invalid session id';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'A session is either terminated or not started',
      NoSuchDriverError.code(),
      NoSuchDriverError.w3cStatus(),
      NoSuchDriverError.error(),
      cause,
    );
  }
}

export class NoSuchElementError extends ProtocolError {
  static code() {
    return 7;
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }
  static error() {
    return 'no such element';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'An element could not be located on the page using the given ' + 'search parameters.',
      NoSuchElementError.code(),
      NoSuchElementError.w3cStatus(),
      NoSuchElementError.error(),
      cause,
    );
  }
}

export class NoSuchFrameError extends ProtocolError {
  static code() {
    return 8;
  }
  static error() {
    return 'no such frame';
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'A request to switch to a frame could not be satisfied because ' +
          'the frame could not be found.',
      NoSuchFrameError.code(),
      NoSuchFrameError.w3cStatus(),
      NoSuchFrameError.error(),
      cause,
    );
  }
}

export class UnknownCommandError extends ProtocolError {
  static code() {
    return 9;
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }
  static error() {
    return 'unknown command';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'The requested resource could not be found, or a request was ' +
          'received using an HTTP method that is not supported by the mapped ' +
          'resource.',
      UnknownCommandError.code(),
      UnknownCommandError.w3cStatus(),
      UnknownCommandError.error(),
      cause,
    );
  }
}

export class StaleElementReferenceError extends ProtocolError {
  static code() {
    return 10;
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }
  static error() {
    return 'stale element reference';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'An element command failed because the referenced element is no ' +
          'longer attached to the DOM.',
      StaleElementReferenceError.code(),
      StaleElementReferenceError.w3cStatus(),
      StaleElementReferenceError.error(),
      cause,
    );
  }
}

export class ElementNotVisibleError extends ProtocolError {
  static code() {
    return 11;
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }
  static error() {
    return 'element not visible';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'An element command could not be completed because the element is ' +
          'not visible on the page.',
      ElementNotVisibleError.code(),
      ElementNotVisibleError.w3cStatus(),
      ElementNotVisibleError.error(),
      cause,
    );
  }
}

export class InvalidElementStateError extends ProtocolError {
  static code() {
    return 12;
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }
  static error() {
    return 'invalid element state';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'An element command could not be completed because the element is ' +
          'in an invalid state (e.g. attempting to click a disabled element).',
      InvalidElementStateError.code(),
      InvalidElementStateError.w3cStatus(),
      InvalidElementStateError.error(),
      cause,
    );
  }
}

export class UnknownError extends ProtocolError {
  static code() {
    return 13;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unknown error';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An unknown server-side error occurred while processing the command.',
      UnknownError.code(),
      UnknownError.w3cStatus(),
      UnknownError.error(),
      cause,
    );
  }
}

export class UnknownMethodError extends ProtocolError {
  static code() {
    return 405;
  }
  static w3cStatus() {
    return HTTPStatusCodes.METHOD_NOT_ALLOWED;
  }
  static error() {
    return 'unknown method';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'The requested command matched a known URL but did not match an method for that URL',
      UnknownMethodError.code(),
      UnknownMethodError.w3cStatus(),
      UnknownMethodError.error(),
      cause,
    );
  }
}

export class UnsupportedOperationError extends ProtocolError {
  static code() {
    return 405;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unsupported operation';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'A server-side error occurred. Command cannot be supported.',
      UnsupportedOperationError.code(),
      UnsupportedOperationError.w3cStatus(),
      UnsupportedOperationError.error(),
      cause,
    );
  }
}

export class ElementIsNotSelectableError extends ProtocolError {
  static code() {
    return 15;
  }
  static error() {
    return 'element not selectable';
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An attempt was made to select an element that cannot be selected.',
      ElementIsNotSelectableError.code(),
      ElementIsNotSelectableError.w3cStatus(),
      ElementIsNotSelectableError.error(),
      cause,
    );
  }
}

export class ElementClickInterceptedError extends ProtocolError {
  static code() {
    return 64;
  }
  static error() {
    return 'element click intercepted';
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'The Element Click command could not be completed because the element receiving ' +
          'the events is obscuring the element that was requested clicked',
      ElementClickInterceptedError.code(),
      ElementClickInterceptedError.w3cStatus(),
      ElementClickInterceptedError.error(),
      cause,
    );
  }
}

export class ElementNotInteractableError extends ProtocolError {
  static code() {
    return 60;
  }
  static error() {
    return 'element not interactable';
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'A command could not be completed because the element is not pointer- or keyboard interactable',
      ElementNotInteractableError.code(),
      ElementNotInteractableError.w3cStatus(),
      ElementNotInteractableError.error(),
      cause,
    );
  }
}

export class InsecureCertificateError extends ProtocolError {
  static error() {
    return 'insecure certificate';
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'Navigation caused the user agent to hit a certificate warning, which is usually the result of an expired or invalid TLS certificate',
      UnknownError.code(),
      InsecureCertificateError.w3cStatus(),
      InsecureCertificateError.error(),
      cause,
    );
  }
}

export class JavaScriptError extends ProtocolError {
  static code() {
    return 17;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'javascript error';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An error occurred while executing user supplied JavaScript.',
      JavaScriptError.code(),
      JavaScriptError.w3cStatus(),
      JavaScriptError.error(),
      cause,
    );
  }
}

export class XPathLookupError extends ProtocolError {
  static code() {
    return 19;
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }
  static error() {
    return 'invalid selector';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An error occurred while searching for an element by XPath.',
      XPathLookupError.code(),
      XPathLookupError.w3cStatus(),
      XPathLookupError.error(),
      cause,
    );
  }
}

export class TimeoutError extends ProtocolError {
  static code() {
    return 21;
  }
  static w3cStatus() {
    return HTTPStatusCodes.REQUEST_TIMEOUT;
  }
  static error() {
    return 'timeout';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An operation did not complete before its timeout expired.',
      TimeoutError.code(),
      TimeoutError.w3cStatus(),
      TimeoutError.error(),
      cause,
    );
  }
}

export class NoSuchWindowError extends ProtocolError {
  static code() {
    return 23;
  }
  static error() {
    return 'no such window';
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'A request to switch to a different window could not be satisfied ' +
          'because the window could not be found.',
      NoSuchWindowError.code(),
      NoSuchWindowError.w3cStatus(),
      NoSuchWindowError.error(),
      cause,
    );
  }
}

export class InvalidArgumentError extends ProtocolError {
  static code() {
    return 61;
  }
  static error() {
    return 'invalid argument';
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'The arguments passed to the command are either invalid or malformed',
      InvalidArgumentError.code(),
      InvalidArgumentError.w3cStatus(),
      InvalidArgumentError.error(),
      cause,
    );
  }
}

export class InvalidCookieDomainError extends ProtocolError {
  static code() {
    return 24;
  }
  static error() {
    return 'invalid cookie domain';
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'An illegal attempt was made to set a cookie under a different ' +
          'domain than the current page.',
      InvalidCookieDomainError.code(),
      InvalidCookieDomainError.w3cStatus(),
      InvalidCookieDomainError.error(),
      cause,
    );
  }
}

export class NoSuchCookieError extends ProtocolError {
  static code() {
    return 62;
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }
  static error() {
    return 'no such cookie';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message ||
        'No cookie matching the given path name was found amongst the associated cookies of the current browsing context’s active document',
      NoSuchCookieError.code(),
      NoSuchCookieError.w3cStatus(),
      NoSuchCookieError.error(),
      cause,
    );
  }
}

export class UnableToSetCookieError extends ProtocolError {
  static code() {
    return 25;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unable to set cookie';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || "A request to set a cookie's value could not be satisfied.",
      UnableToSetCookieError.code(),
      UnableToSetCookieError.w3cStatus(),
      UnableToSetCookieError.error(),
      cause,
    );
  }
}

export class UnexpectedAlertOpenError extends ProtocolError {
  static code() {
    return 26;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unexpected alert open';
  }
  constructor(message: string = '', cause?: Error) {
    super(
      message || 'A modal dialog was open, blocking this operation',
      UnexpectedAlertOpenError.code(),
      UnexpectedAlertOpenError.w3cStatus(),
      UnexpectedAlertOpenError.error(),
      cause,
    );
  }
}

export class NoAlertOpenError extends ProtocolError {
  static code() {
    return 27;
  }
  static w3cStatus() {
    return HTTPStatusCodes.NOT_FOUND;
  }
  static error() {
    return 'no such alert';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An attempt was made to operate on a modal dialog when one was not open.',
      NoAlertOpenError.code(),
      NoAlertOpenError.w3cStatus(),
      NoAlertOpenError.error(),
      cause,
    );
  }
}

export class NoSuchAlertError extends NoAlertOpenError {}

export class ScriptTimeoutError extends ProtocolError {
  static code() {
    return 28;
  }
  static w3cStatus() {
    return HTTPStatusCodes.REQUEST_TIMEOUT;
  }
  static error() {
    return 'script timeout';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'A script did not complete before its timeout expired.',
      ScriptTimeoutError.code(),
      ScriptTimeoutError.w3cStatus(),
      ScriptTimeoutError.error(),
      cause,
    );
  }
}

export class InvalidElementCoordinatesError extends ProtocolError {
  static code() {
    return 29;
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }
  static error() {
    return 'invalid coordinates';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'The coordinates provided to an interactions operation are invalid.',
      InvalidElementCoordinatesError.code(),
      InvalidElementCoordinatesError.w3cStatus(),
      InvalidElementCoordinatesError.error(),
      cause,
    );
  }
}

export class InvalidCoordinatesError extends InvalidElementCoordinatesError {}

export class IMENotAvailableError extends ProtocolError {
  static code() {
    return 30;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unsupported operation';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'IME was not available.',
      IMENotAvailableError.code(),
      IMENotAvailableError.w3cStatus(),
      IMENotAvailableError.error(),
      cause,
    );
  }
}

export class IMEEngineActivationFailedError extends ProtocolError {
  static code() {
    return 31;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unsupported operation';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'An IME engine could not be started.',
      IMEEngineActivationFailedError.code(),
      IMEEngineActivationFailedError.w3cStatus(),
      IMEEngineActivationFailedError.error(),
      cause,
    );
  }
}

export class InvalidSelectorError extends ProtocolError {
  static code() {
    return 32;
  }
  static w3cStatus() {
    return HTTPStatusCodes.BAD_REQUEST;
  }
  static error() {
    return 'invalid selector';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'Argument was an invalid selector (e.g. XPath/CSS).',
      InvalidSelectorError.code(),
      InvalidSelectorError.w3cStatus(),
      InvalidSelectorError.error(),
      cause,
    );
  }
}

export class SessionNotCreatedError extends ProtocolError {
  static code() {
    return 33;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'session not created';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      `A new session could not be created.${message ? (' Details: ' + message) : ''}`,
      SessionNotCreatedError.code(),
      SessionNotCreatedError.w3cStatus(),
      SessionNotCreatedError.error(),
      cause,
    );
  }
}

export class MoveTargetOutOfBoundsError extends ProtocolError {
  static code() {
    return 34;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'move target out of bounds';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'Target provided for a move action is out of bounds.',
      MoveTargetOutOfBoundsError.code(),
      MoveTargetOutOfBoundsError.w3cStatus(),
      MoveTargetOutOfBoundsError.error(),
      cause,
    );
  }
}

export class NoSuchContextError extends ProtocolError {
  static code() {
    return 35;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'No such context found.',
      NoSuchContextError.code(),
      UnknownError.w3cStatus(),
      UnknownError.error(),
      cause,
    );
  }
}

export class InvalidContextError extends ProtocolError {
  static code() {
    return 36;
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'That command could not be executed in the current context.',
      InvalidContextError.code(),
      UnknownError.w3cStatus(),
      UnknownError.error(),
      cause,
    );
  }
}

// Aliases to UnknownMethodError
export class NotYetImplementedError extends UnknownMethodError {
  constructor(message: string = '', cause?: Error) {
    super(message || 'Method has not yet been implemented', cause);
  }
}
export class NotImplementedError extends UnknownMethodError {
  constructor(message: string = '', cause?: Error) {
    super(message || 'Method is not implemented', cause);
  }
}

export class UnableToCaptureScreen extends ProtocolError {
  static code() {
    return 63;
  }
  static w3cStatus() {
    return HTTPStatusCodes.INTERNAL_SERVER_ERROR;
  }
  static error() {
    return 'unable to capture screen';
  }

  constructor(message: string = '', cause?: Error) {
    super(
      message || 'A screen capture was made impossible',
      UnableToCaptureScreen.code(),
      UnableToCaptureScreen.w3cStatus(),
      UnableToCaptureScreen.error(),
      cause,
    );
  }
}

function generateBadParametersMessage(
  paramRequirements: ParameterRequirements,
  paramNames: string[]
): string {
  const toArray = function <T> (x: T | T[]): T[] {
    if (_.isUndefined(x)) {
      return [];
    }
    if (_.isArray(x)) {
      return x;
    }
    return [x];
  };

  const requiredParamNames = toArray(paramRequirements.required);
  const actualParamNames = toArray(paramNames);
  const missingRequiredParamNames = _.difference(requiredParamNames, actualParamNames);
  const resultLines: string[] = [];
  resultLines.push(
    _.isEmpty(missingRequiredParamNames)
      ? // This should not happen
        'Some of the provided parameters are not known'
      : `The following required parameter${
          missingRequiredParamNames.length === 1 ? ' is' : 's are'
        } missing: ${JSON.stringify(missingRequiredParamNames)}`,
  );
  if (!_.isEmpty(requiredParamNames)) {
    resultLines.push(`Known required parameters are: ${JSON.stringify(requiredParamNames)}`);
  }
  const optionalParamNames = _.difference(toArray(paramRequirements.optional), ['sessionId', 'id']);
  if (!_.isEmpty(optionalParamNames)) {
    resultLines.push(`Known optional parameters are: ${JSON.stringify(optionalParamNames)}`);
  }
  resultLines.push(
    `You have provided${
      _.isEmpty(actualParamNames) ? ' none' : ': ' + JSON.stringify(paramNames)
    }`,
  );
  return resultLines.join('\n');
}

// Equivalent to W3C InvalidArgumentError
export class BadParametersError extends InvalidArgumentError {
  constructor(paramReqs: ParameterRequirements, paramNames: string[]) {
    super(generateBadParametersMessage(paramReqs, paramNames));
  }
}

/**
 * ProxyRequestError is a custom error and will be thrown up on unsuccessful proxy request and
 * will contain information about the proxy failure.
 * In case of ProxyRequestError should fetch the actual error by calling `getActualError()`
 * for proxy failure to generate the client response.
 */
export class ProxyRequestError extends BaseError {
  private readonly _w3cError?: W3CError;
  private readonly _w3cErrorStatus?: number;
  private readonly _jwpError?: MJSONWPError;

  constructor(
    message: string,
    httpResponseData: any,
    httpStatus?: number,
    cause?: Error,
  ) {
    const [responseErrorObj, originalMessage] = ProxyRequestError._parseHttpResponse(httpResponseData);
    super(
      _.isEmpty(message)
        ? `Proxy request unsuccessful.${originalMessage ? (' ' + originalMessage) : ''}`
        : message,
      cause,
    );

    // If the response error is an object and value is an object, it's a W3C error (for JSONWP value is a string)
    if (_.isPlainObject(responseErrorObj.value) && _.has(responseErrorObj.value, 'error')) {
      this._w3cError = responseErrorObj.value;
      this._w3cErrorStatus = httpStatus;
    } else if (_.has(responseErrorObj, 'status')) {
      this._jwpError = responseErrorObj;
    }
  }

  getActualError(): ProtocolError {
    if (util.hasValue(this._jwpError?.status) && util.hasValue(this._jwpError?.value)) {
      // If it's MJSONWP error, returns actual error cause for request failure based on `jsonwp.status`
      return errorFromMJSONWPStatusCode(this._jwpError.status, this._jwpError.value);
    }
    if (util.hasValue(this._w3cError) && _.isNumber(this._w3cErrorStatus) && this._w3cErrorStatus >= 300) {
      return errorFromW3CJsonCode(
        this._w3cError.error,
        this._w3cError.message || this.message,
        this._w3cError.stacktrace || this.stack,
      );
    }
    return new UnknownError(this.message, this.cause);
  }

  private static _parseHttpResponse(data: any): [Record<string, any>, string] {
    let responseErrorObj: Record<string, any> = util.safeJsonParse(data);
    if (!_.isPlainObject(responseErrorObj)) {
      responseErrorObj = {};
    }
    let errorMessage: string = _.isString(data) ? data : '';
    if (_.isString(responseErrorObj.value)) {
      errorMessage = responseErrorObj.value;
    } else if (_.isString(responseErrorObj.value?.message)) {
      errorMessage = responseErrorObj.value.message;
    }
    return [responseErrorObj, errorMessage];
  }
}

// map of error class name to error class
export const errors = {
  NotYetImplementedError,
  NotImplementedError,
  InvalidArgumentError,
  NoSuchDriverError,
  NoSuchElementError,
  UnknownCommandError,
  StaleElementReferenceError,
  ElementNotVisibleError,
  InvalidElementStateError,
  UnknownError,
  ElementIsNotSelectableError,
  ElementClickInterceptedError,
  ElementNotInteractableError,
  InsecureCertificateError,
  JavaScriptError,
  XPathLookupError,
  TimeoutError,
  NoSuchWindowError,
  NoSuchCookieError,
  InvalidCookieDomainError,
  InvalidCoordinatesError,
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
  NoSuchAlertError,
  NoSuchContextError,
  InvalidContextError,
  NoSuchFrameError,
  UnableToCaptureScreen,
  UnknownMethodError,
  UnsupportedOperationError,
  ProxyRequestError,
} as const;

const jsonwpErrorCodeMap: Record<string, Class<ProtocolError>> = _.values(errors)
  .reduce((acc: Record<string, Class<ProtocolError>>, ErrorClass: any) => {
    if ('code' in ErrorClass) {
      acc[ErrorClass.code()] = ErrorClass;
    }
    return acc;
  }, {});

const w3cErrorCodeMap: Record<string, Class<ProtocolError>> = _.values(errors)
  .reduce((acc: Record<string, Class<ProtocolError>>, ErrorClass: any) => {
    if ('error' in ErrorClass) {
      acc[ErrorClass.error()] = ErrorClass;
    }
    return acc;
  }, {});


/**
 * Type guard to check if an Error is of a specific type
 */
export function isErrorType<T>(err: any, type: Class<T>): err is T {
  return err.constructor?.name === type.name;
}

/**
 * Retrieve an error derived from MJSONWP status
 * @param code JSONWP status code
 * @param value The error message, or an object with a `message` property
 * @return The error that is associated with provided JSONWP status code
 */
export function errorFromMJSONWPStatusCode(code: number, value: string | {message: string} = ''): ProtocolError {
  const ErrorClass = jsonwpErrorCodeMap[code] ?? UnknownError;
  mjsonwpLog.debug(`Matched JSONWP error code ${code} to ${ErrorClass.name}`);
  // if `value` is an object, pull message from it, otherwise use the plain
  // value, or default to an empty string, if null
  const message = ((value || {}) as any).message || value || '';
  return new ErrorClass(message);
}

/**
 * Retrieve an error derived from W3C JSON Code
 * @param signature W3C error string (see https://www.w3.org/TR/webdriver/#handling-errors `JSON Error Code` column)
 * @param message the error message
 * @param stacktrace an optional error stacktrace
 * @return The error that is associated with the W3C error string
 */
export function errorFromW3CJsonCode(signature: string, message: string, stacktrace?: string): ProtocolError {
  const ErrorClass = w3cErrorCodeMap[_.toLower(signature)] ?? UnknownError;
  w3cLog.debug(`Matched W3C error code '${signature}' to ${ErrorClass.name}`);
  const resultError = new ErrorClass(message);
  resultError.stacktrace = stacktrace;
  return resultError;
}

/**
 * Convert an Appium error to proper W3C HTTP response
 *
 * @param err The error that needs to be translated
 */
export function getResponseForW3CError(err: any): [number, { value: W3CError }] {
  const protocolErrorToResponse: (e: ProtocolError) => [number, { value: W3CError }] =
  (e: ProtocolError) => [
    e.w3cStatus,
    {
      value: {
        error: e.error,
        message: e.message,
        stacktrace: e.stacktrace || e.stack,
      }
    }
  ];

  // err is ProtocolError
  if (['error', 'w3cStatus'].every((prop) => _.has(err, prop))) {
    return protocolErrorToResponse(err);
  }

  // err is ProxyRequestError
  if (_.has(err, 'getActualError') && _.isFunction(err.getActualError)) {
    return protocolErrorToResponse(err.getActualError());
  }

  return protocolErrorToResponse(new UnknownError(err.message, err));
}

interface MJSONWPError {
  status: number;
  value?: any;
  message?: string;
}

interface W3CError {
  error: string;
  message?: string;
  stacktrace?: string;
}

interface ParameterRequirements {
  required: string[]|string;
  optional?: string[]|string;
}
