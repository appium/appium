import {TEST_HOST, getTestPort, createAppiumURL} from '../../lib';

describe('TEST_HOST', function () {
  let expect: Chai.ExpectStatic;

  before(async function () {
    const chai = await import('chai');
    (chai as any).should();
    expect = (chai as any).expect;
  });

  it('should be localhost', function () {
    expect(TEST_HOST).to.equal('127.0.0.1');
  });
});

describe('getTestPort()', function () {
  let expect: Chai.ExpectStatic;

  before(async function () {
    const chai = await import('chai');
    (chai as any).should();
    expect = (chai as any).expect;
  });

  it('should get a free test port', async function () {
    const port = await getTestPort();
    expect(port).to.be.a('number');
  });
});

describe('createAppiumURL()', function () {
  let expect: Chai.ExpectStatic;
  let urlFor: (session: string, pathname: string) => string;

  before(async function () {
    const chai = await import('chai');
    (chai as any).should();
    expect = (chai as any).expect;
    urlFor = createAppiumURL(TEST_HOST, 31337);
  });

  it('should create a "new session" URL', function () {
    expect(urlFor('', 'session')).to.equal(`http://${TEST_HOST}:31337/session`);
  });

  it('should create a URL to get an existing session', function () {
    const sessionId = '12345';
    expect(urlFor(sessionId, 'session')).to.equal(
      `http://${TEST_HOST}:31337/session/${sessionId}/session`
    );
  });

  it('should create a URL for a command using an existing session', function () {
    const sessionId = '12345';
    expect(urlFor(sessionId, 'moocow')).to.equal(
      `http://${TEST_HOST}:31337/session/${sessionId}/moocow`
    );
  });
});
