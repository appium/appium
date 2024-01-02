# @appium/support

> Utility functions used to support Appium drivers and plugins

[![NPM version](http://img.shields.io/npm/v/@appium/support.svg)](https://npmjs.org/package/@appium/support)
[![Downloads](http://img.shields.io/npm/dm/@appium/support.svg)](https://npmjs.org/package/@appium/support)

## Usage in drivers and plugins

Drivers and plugins are recommended to have Appium as a peer dependency, as it already includes
these utility functions. Add the following line to `peerDependencies` section of your module's
`package.json`:

```js
  "peerDependencies": {
    "appium": "^<minimum_server_version>"
  }
```

Afterwards import it in your code similarly to the below example:

```js
import {timing, util} from 'appium/support';
```

## Usage in helper modules

If you want to use this module in a helper library, which is not a driver or a plugin,
then add the following line to `dependencies` section of your module's `package.json`:

```js
  "dependencies": {
    "@appium/support": "<module_version>"
  }
```

Afterwards import it in your code similarly to the below example:

```js
import {timing, util} from '@appium/support';
```

## Categories

All utility functions are split into a bunch of different categories. Each category has its own file under the `lib` folder. All utility functions in these files are documented.

|Category|Description|
|-|-|
|console|Wrappers for the command line interface abstraction used by the Appium server|
|doctor|Common doctor utilities that can be used by drivers and plugins|
|env|Several helpers needed by the server to cope with internal dependencies and manifests|
|fs|Most of the functions here are just thin wrappers over utility functions available in [Promises API](https://nodejs.org/api/fs.html#promises-api)|
|image-util|Utilities to work with images. Use [sharp](https://github.com/lovell/sharp) under the hood.<br>:bangbang: Node >=18.17 is required to use these utilities|
|log-internal|Utilities needed for internal Appium log config assistance|
|logging|See [the logging section below](#logging)|
|mjpeg|Helpers needed to implement [MJPEG streaming](https://en.wikipedia.org/wiki/Motion_JPEG#Video_streaming)|
|net|Helpers needed for network interactions, for example, upload and download of files|
|node|Set of Node.js-specific utility functions needed, for example, to ensure objects immutability or to calculate their sizes|
|npm|Set of `npm`-related helpers|
|plist|Set of utilities used to read and write data from [plist](https://en.wikipedia.org/wiki/Property_List) files in javascript|
|process|Helpers for interactions with system processes. These APIs don't support Windows.|
|system|Set of helper functions needed to determine properties of the current operating system|
|tempdir|Set of helpers that allow interactions with temporary folders|
|timing|Helpers that allow to measure execution time|
|util|Miscellaneous utilities|
|zip|Helpers that allow to work with archives in `.zip ` format|

## logging

This is a basic logger defaulting to [npmlog](https://github.com/npm/npmlog) with special
consideration for running tests (doesn't output logs when run with `_TESTING=1`).

### Logging levels

There are a number of levels, exposed as methods on the log object, at which logging can be made.
The built-in ones correspond to those of [npmlog](https://github.com/npm/npmlog#loglevelprefix-message-),
and are: `silly`, `verbose`, `info`, `http`, `warn`, and `error`. There is also a `debug` level.

The default threshold level is `verbose`.

The logged output, by default, will be `level prefix message`. So

```js
import {logging} from 'appium/support';
let log = logging.getLogger('mymodule');
log.warn('a warning');`
```

Will produce

```shell
warn mymodule a warning
```

### Environment variables

There are two environment variable flags that affect the way `logger` works.

|Variable|Description|
|-|-|
|`_TESTING`|If set to `1`, logging output is stopped|
|`_FORCE_LOGS`|If set to `1`, overrides the value of `_TESTING`|

### Usage

`log.level`

- Get and set the threshold level at which to display the logs. Any logs at or above this level will
be displayed. The special level `silent` will prevent anything from being displayed ever. See
[npmlog#level](https://github.com/npm/npmlog#loglevel) for more details.

`log[level](message)`

- Logs `message` at the specified `level`
```js
import {logging} from 'appium/support';
let log = logging.getLogger('mymodule');

log.info('hi!');
// => info mymodule hi!
```

`log.unwrap()`

- Retrieves the underlying [npmlog](https://github.com/npm/npmlog) object, in order to manage how
logging is done at a low level (e.g., changing output streams, retrieving an array of messages,
adding log levels, etc.).

```js
import {logging} from 'appium/support';
let log = logging.getLogger('mymodule');

log.info('hi!');

let npmlogger = log.unwrap();

// any `npmlog` methods
let logs = npmlogger.record;
// logs === [ { id: 0, level: 'info', prefix: 'mymodule', message: 'hi!', messageRaw: [ 'hi!' ] }]
```

`log.errorWithException(error)`

- Logs the error passed in, at `error` level, and then returns the error. If the error passed in is
not an instance of [Error](https://nodejs.org/api/errors.html#errors_class_error) (either directly,
or a subclass of `Error`), it will be wrapped in a generic `Error` object.

```js
import {logging} from 'appium/support';
let log = logging.getLogger('mymodule');

// previously there would be two lines
log.error('This is an error');
throw new Error('This is an error');

// now is compacted
throw log.errorWithException('This is an error');
```

## License

Apache-2.0
