# appium-support

Utility functions used to support libs used across appium packages.

`npm install appium-support`

Appium, as of version 1.5 is all based on promises, so this module provides promise wrappers for some common operations.

Most notably, we wrap `fs` for file system commands. Note the addition of `hasAccess`.
Also note that `fs.mkdir` doesn't throw an error if the directory already exists, it will just resolve.

### Methods

- system.isWindows
- system.isMac
- system.isLinux
- system.isOSWin64
- system.arch
- system.macOsxVersion

- util.hasContent - returns true if input string has content
- util.hasValue - returns true if input value is not undefined and no null
- util.escapeSpace
- util.escapeSpecialChars
- util.localIp
- util.cancellableDelay
- util.multiResolve - multiple path.resolve
- util.unwrapElement - parse an element ID from an element object: e.g.: `{ELEMENT: 123, "element-6066-11e4-a52e-4f735466cecf": 123}` returns `123`
- util.wrapElement - convert an element ID to an element object of the form: e.g.: `123` returns `{ELEMENT: 123, "element-6066-11e4-a52e-4f735466cecf": 123}`

- *fs.hasAccess* - use this over `fs.access`
- *fs.exists* - calls `fs.hasAccess`
- *fs.rimraf*
- *fs.mkdir* - doesn't throw an error if directory already exists
- *fs.copyFile*
- fs.open
- fs.close
- fs.access
- fs.readFile
- fs.writeFile
- fs.write
- fs.readlink
- fs.chmod
- fs.unlink
- fs.readdir
- fs.stat
- fs.rename
- *fs.md5*

- plist.parsePlistFile
- plist.updatePlistFile

- mkdirp

- logger

- zip.extractAllTo - Extracts contents of a zipfile to a directory
- zip.readEntries - Reads entries (files and directories) of a zipfile
- zip.toInMemoryZip - Converts a directory into a base64 zipfile


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

There are two environment variable flags that affect the way `appium-base-driver` `logger` works.

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
