import assert from 'node:assert/strict';
import {describe, it, before} from 'node:test';

import {createAppiumURL, getTestPort, TEST_HOST} from '../../lib';

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
