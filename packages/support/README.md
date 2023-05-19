# appium-support

Utility functions used to support Appium drivers and plugins.

# Usage in drivers and plugins

It is recommended to have Appium as a peer dependency in driver and plugin packages.
Add the following line to `peerDependencies` section of your module's `package.json`:

```js
  "peerDependencies": {
    "appium": "^<minimum_server_version>"
  }
```

Afterwards import it in your code similarly to the below example:

```js
import {timing, util} from 'appium/support';
```

# Usage in helper modules

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

### Categories

All utility functions are split into a bunch of different categories. Each category has its own file under the `lib` folder. All utility functions in these files are documented.

#### fs

Most of the functions there are just thin wrappers over utility functions available in [Promises API](https://nodejs.org/api/fs.html#promises-api).

#### env

Several helpers needed by the server to cope with internal dependencies and manifests.

#### console

Wrappers for the command line interface abstraction used by the Appium server.

#### image-util

Utilities to work with images. Use [sharp](https://github.com/lovell/sharp) under the hood.

#### log-internal

Utilities needed for internal Appium log config assistance.

#### logging

See [below](#logger)

#### mjpeg

Helpers needed to implement [MJPEG streaming](https://en.wikipedia.org/wiki/Motion_JPEG#Video_streaming).

#### net

Helpers needed for network interactions, for example, upload and download of files.

#### node

Set of Node.js-specific utility functions needed, for example, to ensure objects immutability or to calculate their sizes.

#### npm

Set of [npm](https://en.wikipedia.org/wiki/Npm_(software))-related helpers.

#### plist

Set of utilities used to read and write data from [plist](https://en.wikipedia.org/wiki/Property_List) files in javascript.

#### process

Helpers for interactions with system processes. These APIs don't support Windows.

#### system

Set of helper functions needed to determine properties of the current operating system.

#### tempdir

Set of helpers that allow interactions with temporary folders.

#### timing

Helpers that allow to measure execution time.

#### util

Miscellaneous utilities.

#### zip

Helpers that allow to work with archives in .ZIP format.


## logger

Basic logger defaulting to [npmlog](https://github.com/npm/npmlog) with special consideration for running
tests (doesn't output logs when run with `_TESTING=1` in the env).

### Logging levels

There are a number of levels, exposed as methods on the log object, at which logging can be made. The built-in ones correspond to those of [npmlog](https://github.com/npm/npmlog#loglevelprefix-message-), and are:
`silly`, `verbose`, `info`, `http`, `warn`, and `error`. In addition there is a `debug` level.

The default threshold level is `verbose`.

The logged output, by default, will be `level prefix message`. So

```js
import { logger } from 'appium-support';
let log = logger.getLogger('mymodule');
log.warn('a warning');`
```

Will produce

```shell
warn mymodule a warning
```

### Environment variables

There are two environment variable flags that affect the way `logger` works.

`_TESTING`

- `_TESTING=1` stops output of logs when set to `1`.

`_FORCE_LOGS`

- This flag, when set to `1`, reverses the `_TESTING`


### Usage

`log.level`

- get and set the threshold level at which to display the logs. Any logs at or above this level will be displayed. The special level silent will prevent anything from being displayed ever. See [npmlog#level](https://github.com/npm/npmlog#loglevel).

`log[level](message)`

- logs to `level`
```js
import { logger } from 'appium-support';
let log = logger.getLogger('mymodule');

log.info('hi!');
// => info mymodule hi!
```

`log.unwrap()`

- retrieves the underlying [npmlog](https://github.com/npm/npmlog) object, in order to manage how logging is done at a low level (e.g., changing output streams, retrieving an array of messages, adding log levels, etc.).

```js
import { getLogger } from 'appium-base-driver';
let log = getLogger('mymodule');

log.info('hi!');

let npmlogger = log.unwrap();

// any `npmlog` methods
let logs = npmlogger.record;
// logs === [ { id: 0, level: 'info', prefix: 'mymodule', message: 'hi!', messageRaw: [ 'hi!' ] }]
```

`log.errorAndThrow(error)`

- logs the error passed in, at `error` level, and then throws the error. If the error passed in is not an instance of [Error](https://nodejs.org/api/errors.html#errors_class_error) (either directly, or a subclass of `Error`) it will be wrapped in a generic `Error` object.

```js
import { getLogger } from 'appium-base-driver';
let log = getLogger('mymodule');

// previously there would be two lines
log.error('This is an error');
throw new Error('This is an error');

// now is compacted
log.errorAndThrow('This is an error');
```
