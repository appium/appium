## webdriver and mobile-json-wire protocols

An abstraction of the Mobile JSON Wire Protocol ([spec](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md)) and the W3C Wire Protocol ([spec](https://www.w3.org/TR/webdriver/) with Appium extensions (as specified [here](http://www.w3.org/TR/webdriver/#protocol-extensions)).

### Protocol Detection

In the event that a session is requested, and both MJSONWP _and_ W3C capabilities are provided, like this

```
{
  "capabilities: {
    "alwaysMatch": {...}, 
    "firstMatch": [{...}, ...]
  },
  "desiredCapabilities": {...}
}
```

a W3C session will be served _unless_ the W3C Capabilities are incomplete. So if the `"desiredCapabilities"` object has more keys
then whatever the capabilities were matched for the W3C capabilities, then an MJSONWP session will be served instead


### Endpoints in the protocol

The Mobile JSON Wire Protocol package gives access to a number of endpoints documented [here](https://github.com/appium/appium-base-driver/blob/master/docs/mjsonwp/protocol-methods.md).

The W3C WebDriver Protocol package gives access to a number of endpoints documented in the [official documentation](https://www.w3.org/TR/webdriver/) and the 
[simplified spec](https://github.com/jlipps/simple-wd-spec)

### Protocol

The basic class, subclassed by drivers that will use the protocol.


### routeConfiguringFunction (driver)

This function gives drivers access to the protocol routes. It returns a function that itself will take an [Express](http://expressjs.com/) application.


### isSessionCommand (command)

Checks if the `command` needs to have a session associated with it.


### ALL_COMMANDS

An array of all the commands that will be dispatched to by the Mobile JSON Wire Proxy endpoints.


### NO_SESSION_ID_COMMANDS

An array of commands that do not need a session associated with them.


### Errors

This package exports a number of classes and methods related to Selenium error handling. There are error classes for each Selenium error type (see [JSONWP Errors](https://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes), as well as the context errors in the [mobile spec](https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts). 

The list of errors, and their meanings, can be found [here for JSONWP](https://github.com/appium/appium-base-driver/blob/master/docs/mjsonwp/errors.md) and
[here for W3C Errors](https://www.w3.org/TR/webdriver/#handling-errors))

There are, in addition, two helper methods for dealing with errors

`isErrorType (err, type)`

- checks if the `err` object is a Mobile JSON Wire Protocol error of a particular type
- arguments
  - `err` - the error object to test
  - `type` - the error class to test against
- usage
  ```js
  import { errors, isErrorType } from 'mobile-json-wire-protocol';

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
  import { errors, errorFromCode } from 'mobile-json-wire-protocol';

  let error = errorFromCode(6, 'an error has occurred');

  console.log(error instanceof errors.NoSuchDriverError);
  // => true

  console.log(error.message === 'an error has occurred');
  // => true
  ```
