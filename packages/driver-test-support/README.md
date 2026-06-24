# @appium/driver-test-support

> Testing utilities for [Appium](https://appium.io) drivers

This package is for driver authors to help test their drivers.

## Usage

### Helpers

These are just some helpers (mainly for E2E tests):

```js
import {TEST_HOST, getTestPort, createAppiumURL} from '@appium/driver-test-support';
import assert from 'node:assert';

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
  const urlFor = createAppiumURL(TEST_HOST, 31337);

  it('should create a "new session" URL', function() {
    assert.strictEqual(urlFor('', 'session'), `http://${TEST_HOST}:31337/session`);
  });

  it('should create a URL for a session command', function() {
    const sessionId = '12345';
    assert.strictEqual(
      urlFor(sessionId, 'moocow'),
      `http://${TEST_HOST}:31337/session/${sessionId}/moocow`
    );
  });
});
```

## Installation

`appium` is peer dependency.

```bash
npm install appium @appium/driver-test-support --save-dev
```

## License

Apache-2.0
