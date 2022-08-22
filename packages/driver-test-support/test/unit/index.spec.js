import {TEST_HOST, getTestPort, createAppiumURL} from '../../lib';
import _ from 'lodash';

const {expect} = chai;

describe('TEST_HOST', function () {
  it('should be localhost', function () {
    expect(TEST_HOST).to.equal('127.0.0.1');
  });
});

describe('getTestPort()', function () {
  it('should get a free test port', async function () {
    const port = await getTestPort();
    expect(port).to.be.a('number');
  });
});

describe('createAppiumURL()', function () {
  it('should create a "new session" URL', function () {
    const actual = createAppiumURL(TEST_HOST, 31337, '', 'session');
    const expected = `http://${TEST_HOST}:31337/session`;
    expect(actual).to.equal(expected);
  });

  it('should create a URL to get an existing session', function () {
    const sessionId = '12345';
    const createGetSessionURL = createAppiumURL(TEST_HOST, 31337, _, 'session');
    const actual = createGetSessionURL(sessionId);
    const expected = `http://${TEST_HOST}:31337/session/${sessionId}/session`;
    expect(actual).to.equal(expected);
  });

  it('should create a URL for a command using an existing session', function () {
    const sessionId = '12345';
    const createURLWithPath = createAppiumURL('127.0.0.1', 31337, sessionId);
    const actual = createURLWithPath('moocow');
    const expected = `http://${TEST_HOST}:31337/session/${sessionId}/moocow`;
    expect(actual).to.equal(expected);
  });
});
