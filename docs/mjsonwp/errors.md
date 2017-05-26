## Mobile JSON Wire Protocol Errors

This package exports a number of classes and methods related to Selenium error handling. There are error classes for each Selenium error type (see [here](https://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes), as well as the context errors in the [mobile spec](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts)).

These classes, which are constructed with a string message (defaulting to the "Details" below), are available through the `errors` object exported by the module. They are

| Code | Class Name                       | Details
| -----|----------------------------------|-----------------------------------------------
|      | `MJSONWPError`<sup>1</sup>       | Base class for other errors
| 6    | `NoSuchDriverError`              | A session is either terminated or not started
| 7    | `NoSuchElementError`             | An element could not be located on the page using the given search parameters
| 8    | `NoSuchFrameError`               | A request to switch to a frame could not be satisfied because the frame could not be found
| 9    | `UnknownCommandError`            | The requested resource could not be found, or a request was received using an HTTP method that is not supported by the mapped resource
| 10   | `StaleElementReferenceError`     | An element command failed because the referenced element is no longer attached to the DOM
| 11   | `ElementNotVisibleError`         | An element command could not be completed because the element is not visible on the page
| 12   | `InvalidElementStateError`       | An element command could not be completed because the element is in an invalid state (e.g., attempting to click a disabled element)
| 13   | `UnknownError`                   | An unknown server-side error occurred while processing the command
| 13   | `NotYetImplementedError`         | The operation requested is not yet implemented by the driver
| 13   | `NotImplementedError`            | The operation requested will not be implemented by the driver
| 15   | `ElementIsNotSelectableError`    | An attempt was made to select an element that cannot be selected
| 17   | `JavaScriptError`                | An error occurred while executing user supplied JavaScript
| 19   | `XPathLookupError`               | An error occurred while searching for an element by XPath
| 21   | `TimeoutError`                   | An operation did not complete before its timeout expired
| 23   | `NoSuchWindowError`              | A request to switch to a different window could not be satisfied because the window could not be found
| 24   | `InvalidCookieDomainError`       | An illegal attempt was made to set a cookie under a different domain than the current page
| 25   | `UnableToSetCookieError`         | A request to set a cookie's value could not be satisfied
| 26   | `UnexpectedAlertOpenError`       | A modal dialog was open, blocking this operation
| 27   | `NoAlertOpenError`               | An attempt was made to operate on a modal dialog when one was not open
| 28   | `ScriptTimeoutError`             | A script did not complete before its timeout expired
| 29   | `InvalidElementCoordinatesError` | The coordinates provided to an interactions operation are invalid
| 30   | `IMENotAvailableError`           | Input Method Editor was not available
| 31   | `IMEEngineActivationFailedError` | An Input Method Editor engine could not be started
| 32   | `InvalidSelectorError`           | Argument was an invalid selector (e.g., XPath/CSS)
| 33   | `SessionNotCreatedError`         | A new session could not be created
| 34   | `MoveTargetOutOfBoundsError`     | Target provided for a move action is out of bounds
| 35   | `NoSuchContextError`             | Context provided (e.g., `WEBVIEW_42`) does not exist
| 36   | `InvalidContextError`            | The operation could not be performed in the current context
|      |                                  |
|      | `BadParametersError`<sup>2</sup> | The parameters specified for the operation are incorrect

<sup>1</sup> `MJSONWPError` is the base class for all errors that are part of the Selenium specification (i.e., all errors except `BadParametersError`), and not itself part of that specification.
<sup>2</sup> `BadParametersError` is not part of the Selenium specification, but deals with request management.

There are, in addition, two helper methods for dealing with errors

`isErrorType (err, type)`

- checks if the `err` object is a Mobile JSON Wire Protocol error of a particular type
- arguments
  - `err` - the error object to test
  - `type` - the error class to test against
- usage
  ```js
  import { errors, isErrorType } from 'appium-base-driver';

  try {
    // do some stuff...
  } catch (err) {
    if (isErrorType(err, errors.InvalidCookieDomainError)) {
      // process...
    }
  }
  ```

`errorFromCode (code, message)`

- retrieve the appropriate error for an error code, with the supplied message.
- arguments
  - `code` - the integer error code for a Mobile JSON Wire Protocol error
  - `message` - the message to be encapsulated in the error
- usage
  ```js
  import { errors, errorFromCode } from 'appium-base-driver';

  let error = errorFromCode(6, 'an error has occurred');

  console.log(error instanceof errors.NoSuchDriverError);
  // => true

  console.log(error.message === 'an error has occurred');
  // => true
  ```
