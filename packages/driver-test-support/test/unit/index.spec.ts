import assert from 'node:assert/strict';
import {describe, it, before} from 'node:test';

import {createAppiumURL, getTestPort, TEST_HOST} from '../../lib/index.js';

describe('TEST_HOST', function () {
  it('should be localhost', function () {
    assert.equal(TEST_HOST, '127.0.0.1');
  });
});

describe('getTestPort()', function () {
  it('should get a free test port', async function () {
    const port = await getTestPort();
    assert.ok(typeof port === 'number');
  });
});

describe('createAppiumURL()', function () {
  it('should accept bare IPv6 in both calling forms', function () {
    const expected = 'http://[::1]:4723/session/abc/url';
    assert.equal(createAppiumURL('::1', 4723, 'abc', 'url'), expected);
    assert.equal(createAppiumURL('::1', 4723)('abc', 'url'), expected);
  });

  it('should preserve an explicit scheme with a bracketed IPv6 host', function () {
    assert.equal(createAppiumURL('https://[::1]', 4723, '', 'status'), 'https://[::1]:4723/status');
  });

  let urlFor: (session: string, pathname: string) => string;

  before(async function () {
    urlFor = createAppiumURL(TEST_HOST, 31337);
  });

  it('should create a "new session" URL', function () {
    assert.equal(urlFor('', 'session'), `http://${TEST_HOST}:31337/session`);
  });

  it('should create a URL to get an existing session', function () {
    const sessionId = '12345';
    assert.equal(urlFor(sessionId, 'session'), `http://${TEST_HOST}:31337/session/${sessionId}/session`);
  });

  it('should create a URL for a command using an existing session', function () {
    const sessionId = '12345';
    assert.equal(urlFor(sessionId, 'moocow'), `http://${TEST_HOST}:31337/session/${sessionId}/moocow`);
  });
});
