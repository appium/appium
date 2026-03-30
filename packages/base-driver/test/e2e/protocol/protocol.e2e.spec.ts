import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {server, routeConfiguringFunction, errors, JWProxy, BaseDriver} from '../../../lib';
import {FakeDriver} from './fake-driver';
import axios from 'axios';
import {createSandbox} from 'sinon';
import {StatusCodes as HTTPStatusCodes} from 'http-status-codes';
import {createProxyServer} from './helpers';
import {MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY} from '../../../lib/constants';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

let port: number;
let baseUrl: string;

describe('Protocol', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  before(async function () {
    port = await getTestPort();
    baseUrl = `http://${TEST_HOST}:${port}`;
  });

  //TODO: more tests!:
  // Unknown commands should return 404

  describe('direct to driver', function () {
    const d = new FakeDriver();
    it('should return response values directly from the driver', async function () {
      expect(await d.setUrl('http://google.com')).to.contain('google');
    });
  });

  describe('via express router', function () {
    let mjsonwpServer;
    let driver;

    before(async function () {
      driver = new FakeDriver();
      driver.sessionId = 'foo';
      mjsonwpServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver),
        port,
      });
    });

    after(async function () {
      await mjsonwpServer.close();
    });

    it('should proxy to driver and return valid jsonwp response', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
        sessionId: 'foo',
      });
    });

    it('should assume requests without a Content-Type are json requests', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
        sessionId: 'foo',
      });
    });

    it('should respond to x-www-form-urlencoded as well as json requests', async function () {
      const reqData = new URLSearchParams();
      reqData.set('url', 'http://google.com');
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        data: reqData.toString(),
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
        sessionId: 'foo',
      });
    });

    it('should include url request parameters for methods to use - sessionid', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/back`,
        method: 'POST',
        data: {},
      });
      expect(data).to.eql({
        value: 'foo',
        sessionId: 'foo',
      });
    });

    it('should include url request parameters for methods to use - elementid', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/click`,
        method: 'POST',
        data: {},
      });
      expect(data.value).to.eql(['bar', 'foo']);
    });

    it('should include url req params in the order: custom, element, session', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/attribute/baz`,
      });
      expect(data.value).to.eql(['baz', 'bar', 'foo']);
    });

    it('should respond with 400 Bad Request if parameters missing', async function () {
      const {data, status} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {},
        validateStatus: null,
      });
      expect(status).to.equal(400);
      expect(JSON.stringify(data)).to.contain('url');
    });

    it('should reject requests with a badly formatted body and not crash', async function () {
      await expect(
        axios({
          url: `${baseUrl}/session/foo/url`,
          method: 'POST',
          data: 'oh hello',
        })
      ).to.be.rejected;

      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
        sessionId: 'foo',
      });
    });

    it('should get 404 for bad routes', async function () {
      await expect(
        axios({
          url: `${baseUrl}/blargimarg`,
        })
      ).to.be.rejectedWith(/404/);
    });

    it('4xx responses should have content-type of application/json', async function () {
      const {headers} = await axios({
        url: `${baseUrl}/blargimargarita`,
        validateStatus: null,
      });

      expect(headers['content-type']).to.include('application/json');
    });

    it('should throw not yet implemented for unfilledout commands', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/location`,
        validateStatus: null,
      });

      expect(status).to.equal(405);
      expect(data.value.error).to.eql('unknown method');
      expect(data.value.message).to.eql('Method has not yet been implemented');
      expect(data.sessionId).to.eql('foo');
    });

    it('should throw not implemented for ignored commands', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/buttonup`,
        method: 'POST',
        validateStatus: null,
        data: {},
      });

      expect(status).to.equal(405);
      expect(data.value.error).to.eql('unknown method');
      expect(data.value.message).to.eql('Method has not yet been implemented');
      expect(data.sessionId).to.eql('foo');
    });

    it('should get 400 for bad parameters', async function () {
      await expect(
        axios({
          url: `${baseUrl}/session/foo/url`,
          method: 'POST',
          data: {},
        })
      ).to.be.rejectedWith(/400/);
    });

    it('should ignore special extra payload params in the right contexts', async function () {
      await axios({
        url: `${baseUrl}/session/foo/element/bar/value`,
        method: 'POST',
        data: {id: 'baz', sessionId: 'lol', value: ['a']},
      });

      await expect(
        axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {id: 'baz'},
        })
      ).to.be.rejectedWith(/400/);

      // make sure adding the optional 'id' doesn't clobber a route where we
      // have an actual required 'id'
      await axios({
        url: `${baseUrl}/session/foo/frame`,
        method: 'POST',
        data: {id: 'baz'},
      });
    });

    it('should return the correct error even if driver does not throw', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/appium/settings`,
        method: 'GET',
        validateStatus: null,
      });
      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql('Mishandled Driver Error');
      expect(data.sessionId).to.not.exist;
    });

    describe('w3c sendkeys migration', function () {
      it('should accept value for sendkeys', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {value: 'text to type'},
        });
        expect(data.value).to.eql(['text to type', 'bar']);
      });
      it('should accept text for sendkeys', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {text: 'text to type'},
        });
        expect(data.value).to.eql(['text to type', 'bar']);
      });
      it('should accept value and text for sendkeys, and use value', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {value: 'text to type', text: 'text to ignore'},
        });
        expect(data.value).to.eql(['text to type', 'bar']);
      });
    });

    describe('multiple sets of arguments', function () {
      describe('optional', function () {
        it('should allow moveto with element', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/moveto`,
            method: 'POST',
            data: {element: '3'},
          });
          expect(data.value).to.eql(['3', null, null]);
        });
        it('should allow moveto with xoffset/yoffset', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/moveto`,
            method: 'POST',
            data: {xoffset: 42, yoffset: 17},
          });
          expect(data.value).to.eql([null, 42, 17]);
        });
      });
      describe('required', function () {
        it('should allow removeApp with appId', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/appium/device/remove_app`,
            method: 'POST',
            data: {appId: 42},
          });
          expect(data.value).to.eql(42);
        });
        it('should allow removeApp with bundleId', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/appium/device/remove_app`,
            method: 'POST',
            data: {bundleId: 42},
          });
          expect(data.value).to.eql(42);
        });
      });
    });

    describe('default param wrap', function () {
      it('should wrap', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/touch/perform`,
          method: 'POST',
          data: [{action: 'tap', options: {element: '3'}}],
        });
        expect(data.value).to.deep.equal([[{action: 'tap', options: {element: '3'}}], 'foo']);
      });

      it('should not wrap twice', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/touch/perform`,
          method: 'POST',
          data: {actions: [{action: 'tap', options: {element: '3'}}]},
        });
        expect(data.value).to.deep.equal([[{action: 'tap', options: {element: '3'}}], 'foo']);
      });
    });

    describe('create sessions via HTTP endpoint', function () {
      let sessionId;

      beforeEach(function () {
        sessionId = null;
      });
      afterEach(async function () {
        if (sessionId) {
          await axios.delete(`${baseUrl}/session/${sessionId}`);
        }
      });

      it('should not allow create session with desired caps (MJSONWP)', async function () {
        const desiredCapabilities = {a: 'b'};
        const {data} = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {desiredCapabilities},
        });
        expect(data.value).to.equal(null);
      });
      it('should fail to create session without capabilities', async function () {
        await expect(
          axios({
            url: `${baseUrl}/session`,
            method: 'POST',
            data: {},
          })
        ).to.be.rejectedWith(/400/);
      });
      it('should allow create session with capabilities (W3C)', async function () {
        const w3cCapabilities = {alwaysMatch: {'appium:e': 'f'}};
        const {data} = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {capabilities: w3cCapabilities},
        });
        expect(data.status).to.not.exist;
        expect(data.sessionId).to.not.exist;
        expect(data.value.capabilities).to.eql(w3cCapabilities);
        expect(data.value.sessionId).to.exist;
        sessionId = data.value.sessionId;
      });
      it('should raise an error if the driver does not support W3C yet', async function () {
        const createSessionStub = sandbox
          .stub(driver, 'createSession')
          .callsFake(function (capabilities) {
            driver.sessionId = null;
            return BaseDriver.prototype.createSession.call(driver, capabilities);
          });
        try {
          await expect(
            axios({
              url: `${baseUrl}/session`,
              method: 'POST',
              data: {
                capabilities: {
                  alwaysMatch: {
                    platformName: 'Fake',
                    'appium:deviceName': 'Fake',
                  },
                  firstMatch: [{}],
                },
              },
            })
          ).to.be.rejectedWith(/500/);
        } finally {
          createSessionStub.restore();
        }
      });

      describe('w3c endpoints', function () {
        let sessionUrl;

        beforeEach(async function () {
          // Start a W3C session
          const {value} = (
            await axios({
              url: `${baseUrl}/session`,
              method: 'POST',
              data: {
                capabilities: {
                  alwaysMatch: {
                    platformName: 'Fake',
                    'appium:deviceName': 'Commodore 64',
                  },
                  firstMatch: [{}],
                },
              },
            })
          ).data;
          sessionId = value.sessionId;
          sessionUrl = `${baseUrl}/session/${sessionId}`;
        });

        it('should throw 400 Bad Parameters exception if the parameters are bad', async function () {
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              bad: 'params',
            },
          });
          expect(status).to.equal(400);

          const {error: w3cError, message, stacktrace} = data.value;
          expect(message).to.match(/following required parameter/);
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.InvalidArgumentError.error());
        });

        it(`should throw 405 exception if the command hasn't been implemented yet`, async function () {
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            },
          });
          expect(status).to.equal(405);

          const {error: w3cError, message, stacktrace} = data.value;
          expect(message).to.match(/Method has not yet been implemented/);
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.NotYetImplementedError.error());
          expect(message).to.match(/Method has not yet been implemented/);
        });

        it(`should throw 500 Unknown Error if the command throws an unexpected exception`, async function () {
          driver.performActions = () => {
            throw new Error(`Didn't work`);
          };
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            },
          });
          expect(status).to.equal(500);

          const {error: w3cError, message, stacktrace} = data.value;
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.UnknownError.error());
          expect(message).to.match(/Didn't work/);

          delete driver.performActions;
        });

        it(`should translate element format from MJSONWP to W3C`, async function () {
          const retValue = [
            {
              something: {
                [MJSONWP_ELEMENT_KEY]: 'fooo',
                other: 'bar',
              },
            },
            {
              [MJSONWP_ELEMENT_KEY]: 'bar',
            },
            'ignore',
          ];

          const expectedValue = [
            {
              something: {
                [MJSONWP_ELEMENT_KEY]: 'fooo',
                [W3C_ELEMENT_KEY]: 'fooo',
                other: 'bar',
              },
            },
            {
              [MJSONWP_ELEMENT_KEY]: 'bar',
              [W3C_ELEMENT_KEY]: 'bar',
            },
            'ignore',
          ];

          const findElementsBackup = driver.findElements;
          driver.findElements = () => retValue;
          const {data} = await axios.post(`${sessionUrl}/elements`, {
            using: 'whatever',
            value: 'whatever',
          });
          expect(data.value).to.eql(expectedValue);
          driver.findElements = findElementsBackup;
        });

        it(`should fail with a 408 error if it throws a TimeoutError exception`, async function () {
          const setUrlStub = sandbox.stub(driver, 'setUrl').callsFake(function () {
            throw new errors.TimeoutError();
          });
          const {status, data} = await axios({
            url: `${sessionUrl}/url`,
            method: 'POST',
            validateStatus: null,
            data: {
              url: 'https://example.com/',
            },
          });
          expect(status).to.equal(408);

          const {error: w3cError, message, stacktrace} = data.value;
          expect(stacktrace).to.match(/protocol.js/);
          expect(w3cError).to.be.a('string');
          expect(w3cError).to.equal(errors.TimeoutError.error());
          expect(message).to.match(/An operation did not complete before its timeout expired/);

          setUrlStub.restore();
        });

        it(`should pass with 200 HTTP status code if the command returns a value`, async function () {
          driver.performActions = (actions) => 'It works ' + actions.join('');
          const {status, value, sessionId} = (
            await axios.post(`${sessionUrl}/actions`, {
              actions: ['a', 'b', 'c'],
            })
          ).data;
          expect(sessionId).to.not.exist;
          expect(status).to.not.exist;
          expect(value).to.equal('It works abc');
          delete driver.performActions;
        });

        describe('jwproxy', function () {
          let port;
          let server, jwproxy, app;

          before(async function () {
            port = await getTestPort(true);
          });

          beforeEach(function () {
            const res = createProxyServer(port);
            server = res.server;
            app = res.app;
            jwproxy = new JWProxy({server: TEST_HOST, port});
            jwproxy.sessionId = sessionId;
            driver.performActions = async (actions) =>
              await jwproxy.command('/perform-actions', 'POST', actions);
          });

          afterEach(async function () {
            delete driver.performActions;
            await server.close();
          });

          it('should work if a proxied request returns a response with status 200', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.json({
                sessionId: req.params.sessionId,
                value: req.body,
                status: 0,
              });
            });

            const {status, value, sessionId} = (
              await axios.post(`${sessionUrl}/actions`, {
                actions: [1, 2, 3],
              })
            ).data;
            expect(value).to.eql([1, 2, 3]);
            expect(status).to.not.exist;
            expect(sessionId).to.not.exist;
          });

          it('should return error if a proxied request returns a MJSONWP error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(500).json({
                sessionId,
                status: 6,
                value: 'A problem occurred',
              });
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.NOT_FOUND);
            expect(JSON.stringify(data)).to.match(/A problem occurred/);
          });

          it('should return W3C error if a proxied request returns a W3C error response', async function () {
            const error = new Error(`Some error occurred`) as Error & {w3cStatus?: number};
            error.w3cStatus = 414;
            const executeCommandStub = sandbox.stub(driver, 'executeCommand').returns({
              protocol: 'W3C',
              error,
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {actions: [1, 2, 3]},
            });
            expect(status).to.equal(414);
            const {error: w3cError, message: errMessage, stacktrace} = data.value;
            expect(w3cError).to.equal('unknown error');
            expect(stacktrace).to.match(/Some error occurred/);
            expect(errMessage).to.equal('Some error occurred');
            executeCommandStub.restore();
          });

          it('should return error if a proxied request returns a MJSONWP error response but HTTP status code is 200', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(200).json({
                sessionId: 'Fake Session Id',
                status: 7,
                value: 'A problem occurred',
              });
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.NOT_FOUND);
            const {error: w3cError, message: errMessage, stacktrace} = data.value;
            expect(w3cError).to.equal('no such element');
            expect(errMessage).to.match(/A problem occurred/);
            expect(stacktrace).to.exist;
          });

          it('should return error if a proxied request returns a W3C error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.status(404).json({
                value: {
                  error: 'no such element',
                  message: 'does not make a difference',
                  stacktrace: 'arbitrary stacktrace',
                },
              });
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.NOT_FOUND);
            const {error: w3cError, stacktrace} = data.value;
            expect(w3cError).to.equal('no such element');
            expect(stacktrace).to.match(/arbitrary stacktrace/);
          });

          it('should return an error if a proxied request returns a W3C error response', async function () {
            app.post('/session/:sessionId/perform-actions', (req, res) => {
              res.set('Connection', 'close');
              res.status(444).json({
                value: {
                  error: 'bogus error code',
                  message: 'does not make a difference',
                  stacktrace: 'arbitrary stacktrace',
                },
              });
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {
                actions: [1, 2, 3],
              },
            });
            expect(status).to.equal(HTTPStatusCodes.INTERNAL_SERVER_ERROR);
            const {error: w3cError, stacktrace} = data.value;
            expect(w3cError).to.equal('unknown error');
            expect(stacktrace).to.match(/arbitrary stacktrace/);
          });
        });
      });
    });

    it('should handle commands with no response values', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/forward`,
        method: 'POST',
      });
      expect(data).to.eql({
        value: null,
        sessionId: 'foo',
      });
    });

    it('should allow empty string response values', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/text`,
      });
      expect(data).to.eql({
        value: '',
        sessionId: 'foo',
      });
    });

    it('should send 500 response and an Unknown object for rejected commands', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/refresh`,
        method: 'POST',
        validateStatus: null,
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql(
        'An unknown server-side error occurred while processing ' +
          'the command. Original error: Too Fresh!'
      );
      expect(data.sessionId).to.eql('foo');
    });

    it('should not throw UnknownError when known', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo`,
        validateStatus: null,
      });

      expect(status).to.equal(404);
      expect(data.value.error).to.eql('invalid session id');
      expect(data.value.message).to.eql('A session is either terminated or not started');
      expect(data.sessionId).to.eql('foo');
    });
  });

  describe('session Ids', function () {
    const driver = new FakeDriver();
    let mjsonwpServer;

    before(async function () {
      mjsonwpServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver),
        port,
      });
    });

    after(async function () {
      await mjsonwpServer.close();
    });

    afterEach(function () {
      driver.sessionId = null;
    });

    it('should return null SessionId for commands without sessionIds', async function () {
      const {data} = await axios({
        url: `${baseUrl}/status`,
      });

      expect(data.sessionId).to.equal(null);
    });

    it('responds with the same session ID in the request', async function () {
      const sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      const {data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });

      expect(data.sessionId).to.exist;
      expect(data.sessionId).to.eql(sessionId);
    });

    it('yells if no session exists', async function () {
      const sessionId = 'Vader Sessions';

      const {data, status} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(404);
      expect(data.value.message).to.contain('session');
    });

    it('yells if invalid session is sent', async function () {
      const sessionId = 'Vader Sessions';
      driver.sessionId = 'recession';

      const {data, status} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(404);
      expect(data.value.message).to.contain('session');
    });

    it('should have session IDs in error responses', async function () {
      const sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      const {data, status} = await axios({
        url: `${baseUrl}/session/${sessionId}/refresh`,
        method: 'POST',
        validateStatus: null,
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql(
        'An unknown server-side error occurred while processing ' +
          'the command. Original error: Too Fresh!'
      );
      expect(data.sessionId).to.eql('Vader Sessions');
    });

    it('should return a new session ID on create', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session`,
        method: 'POST',
        data: {
          capabilities: {
            alwaysMatch: {'appium:greeting': 'hello'},
            firstMatch: [{}],
          },
        },
      });

      expect(data.value.sessionId).to.exist;
      expect(data.value.sessionId.indexOf('fakeSession_')).to.equal(0);
      expect(data.value.capabilities).to.eql({
        alwaysMatch: {'appium:greeting': 'hello'},
        firstMatch: [{}],
      });
    });
  });

  describe('via drivers jsonwp proxy', function () {
    let driver;
    const sessionId = 'foo';
    let mjsonwpServer;

    beforeEach(async function () {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      driver.proxyActive = () => true;
      driver.canProxy = () => true;

      mjsonwpServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver),
        port,
        extraMethodMap: FakeDriver.newMethodMap,
      });
    });

    afterEach(async function () {
      await mjsonwpServer.close();
    });

    it('should give a nice error if proxying is set but no proxy function exists', async function () {
      driver.canProxy = () => false;
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql(
        'An unknown server-side error occurred while processing ' +
          'the command. Original error: Trying to proxy to a ' +
          'server but the driver is unable to proxy'
      );
      expect(data.sessionId).to.eql('foo');
    });

    it('should pass on any errors in proxying', async function () {

      driver.proxyReqRes = async function () {
        throw new Error('foo');
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(500);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql(
        'An unknown server-side error occurred while processing ' +
          'the command. Original error: Could not proxy. Proxy error: foo'
      );
      expect(data.sessionId).to.eql('foo');
    });

    it('should able to throw ProxyRequestError in proxying', async function () {

      driver.proxyReqRes = async function () {
        const jsonwp = {
          status: 35,
          value: 'No such context found.',
          sessionId: 'foo',
        };
        throw new errors.ProxyRequestError(`Could not proxy command to remote server. `, jsonwp);
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(400);
      expect(data.value.error).to.eql('unknown error');
      expect(data.value.message).to.eql('No such context found.');
      expect(data.sessionId).to.eql('foo');
    });

    it('should let the proxy handle req/res', async function () {

      driver.proxyReqRes = async function (req, res) {
        res.status(200).json({custom: 'data'});
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(200);
      expect(data).to.eql({custom: 'data'});
    });

    it('should avoid jsonwp proxying when path matches avoidance list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('^/session/[^/]+/url$')]];
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });

      expect(status).to.equal(200);
      expect(data).to.eql({
        value: 'Navigated to: http://google.com',
        sessionId,
      });
    });

    it('should fail if avoid proxy list is malformed in some way', async function () {
      async function badProxyAvoidanceList(list) {
        driver.getProxyAvoidList = () => list;
        const {status, data} = await axios({
          url: `${baseUrl}/session/${sessionId}/url`,
          method: 'POST',
          validateStatus: null,
          data: {url: 'http://google.com'},
        });

        expect(status).to.equal(500);
        expect(data.value.message).to.contain('roxy');
      }
      const lists = ['foo', [['foo']], [['BAR', /lol/]], [['GET', 'foo']]];
      for (const list of lists) {
        await badProxyAvoidanceList(list);
      }
    });

    it('should avoid proxying non-session commands even if not in the list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      const {status, data} = await axios({
        url: `${baseUrl}/status`,
      });

      expect(status).to.equal(200);
      expect(data).to.eql({
        value: "I'm fine",
        sessionId: null,
      });
    });

    it('should avoid proxying deleteSession commands', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      expect(driver.sessionId).to.equal(sessionId);
      const {status} = await axios.delete(`${baseUrl}/session/${sessionId}`);

      expect(status).to.equal(200);
      expect(driver.sessionId).to.not.exist;
      expect(driver.jwpProxyActive).to.be.false;
    });

    it('should avoid proxying when command spec specifies neverProxy', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/noproxy`,
        method: 'GET',
      });

      expect(status).to.equal(200);
      expect(data).to.eql({
        value: 'This was not proxied',
        sessionId,
      });
    });
  });
});
