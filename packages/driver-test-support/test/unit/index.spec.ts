import { expect } from 'chai';
import { createAppiumURL, getTestPort, TEST_HOST } from '../../lib';

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
  let urlFor: (session: string, pathname: string) => string;

  before(async function () {
    urlFor = createAppiumURL(TEST_HOST, 31337);
  });

  it('should create a "new session" URL', function () {
    expect(urlFor('', 'session')).to.equal(`http://${TEST_HOST}:31337/session`);
  });

  it('should create a URL to get an existing session', function () {
    const sessionId = '12345';
    expect(urlFor(sessionId, 'session')).to.equal(`http://${TEST_HOST}:31337/session/${sessionId}/session`);
  });

  it('should create a URL for a command using an existing session', function () {
    const sessionId = '12345';
    expect(urlFor(sessionId, 'moocow')).to.equal(`http://${TEST_HOST}:31337/session/${sessionId}/moocow`);
  });
});
