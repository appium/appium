# @appium/driver-test-support

> Testing utilities for [Appium](https://appium.io) drivers

This package is for driver authors to help test their drivers.

[Mocha](https://mochajs.org) is the supported test framework.

## Usage

### For E2E Tests

The `driverE2ETestSuite` method creates a Mocha test suite which makes HTTP requests to an in-memory server leveraging your driver.

Note that this method must be run within a _suite callback_—not a _test callback_.

```js
import {driverE2ETestSuite} from '@appium/driver-test-support';

const defaultW3CCapabilities = {
  // some capabilities
};

describe('MyDriverClass', function() {
  driverE2ETestSuite(MyDriverClass, defaultW3CCapabilities);

  describe('more tests', function() {
    // ...
  });
});
```

### For Unit Tests

The `driverUnitTestSuite` method creates a Mocha test suite which performs assertions on an isolated instance of your driver.

Note that this method must be run within a _suite callback_—not a _test callback_.

```js
import {driverUnitTestSuite} from '@appium/driver-test-support';

const defaultW3CCapabilities = {
  // some capabilities
};

describe('MyDriverClass', function() {
  driverUnitTestSuite(MyDriverClass, defaultW3CCapabilities);

  describe('more tests', function() {
    // ...
  });
});
```

### Helpers

These are just some helpers (mainly for E2E tests):

```js
import {TEST_HOST, getTestPort, createAppiumURL} from '@appium/driver-test-support';
import assert from 'node:assert';
import _ from 'lodash';

describe('TEST_HOST', function() {
  it('should be localhost', function() {
    assert.strictEqual(TEST_HOST, '127.0.0.1');
  });
});

describe('getTestPort()', function() {
  it('should get a free test port', async function() {
    const port = await getTestPort();
    assert.ok(port > 0);
  });
});

describe('createAppiumURL()', function() {
  it('should create a "new session" URL', function() {
    const actual = createAppiumURL(TEST_HOST, 31337, '', 'session');
    const expected = `http://${TEST_HOST}:31337/session`;
    assert.strictEqual(actual, expected);
  });
  
  it('should create a URL to get an existing session', function() {
    const sessionId = '12345';
    const createGetSessionURL = createAppiumURL(TEST_HOST, 31337, _, 'session');
    const actual = createGetSessionURL(sessionId);
    const expected = `http://${TEST_HOST}:31337/session/${sessionId}/session`;
    assert.strictEqual(actual, expected);
  });
  
  it('should create a URL for a command using an existing session', function() {
    const sessionId = '12345';
    const createURLWithPath = createAppiumURL('127.0.0.1', 31337, sessionId);
    const actual = createURLWithPath('moocow');
    const expected = `http://${TEST_HOST}:31337/session/${sessionId}/moocow`;
    assert.strictEqual(actual, expected);
  });
});
```

## Installation

`appium` and `mocha` are peer dependencies.

```bash
npm install appium mocha @appium/driver-test-support --save-dev
```

## License

Apache-2.0
