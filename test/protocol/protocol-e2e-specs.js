// transpile:mocha

import { server, routeConfiguringFunction, errors, JWProxy, BaseDriver } from '../..';
import { FakeDriver } from './fake-driver';
import _ from 'lodash';
import axios from 'axios';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import HTTPStatusCodes from 'http-status-codes';
import { createProxyServer } from './helpers';
import { MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY } from '../../lib/protocol/protocol';
import qs from 'querystring';


let should = chai.should();
chai.use(chaiAsPromised);

const serverPort = 8181;
const baseUrl = `http://localhost:${serverPort}/wd/hub`;

describe('Protocol', function () {

  //TODO: more tests!:
  // Unknown commands should return 404

  describe('direct to driver', function () {
    let d = new FakeDriver();
    it('should return response values directly from the driver', async function () {
      (await d.setUrl('http://google.com')).should.contain('google');
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
        port: serverPort,
      });
    });

    after(async function () {
      await mjsonwpServer.close();
    });

    it('should proxy to driver and return valid jsonwp response', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'}
      });
      data.should.eql({
        status: 0,
        value: 'Navigated to: http://google.com',
        sessionId: 'foo'
      });
    });

    it('should assume requests without a Content-Type are json requests', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });
      data.should.eql({
        status: 0,
        value: 'Navigated to: http://google.com',
        sessionId: 'foo'
      });
    });

    it('should respond to x-www-form-urlencoded as well as json requests', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        data: qs.stringify({
          url: 'http://google.com',
        }),
      });
      data.should.eql({
        status: 0,
        value: 'Navigated to: http://google.com',
        sessionId: 'foo'
      });
    });

    it('should include url request parameters for methods to use - sessionid', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/back`,
        method: 'POST',
        data: {},
      });
      data.should.eql({
        status: 0,
        value: 'foo',
        sessionId: 'foo'
      });
    });

    it('should include url request parameters for methods to use - elementid', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/click`,
        method: 'POST',
        data: {},
      });
      data.status.should.equal(0);
      data.value.should.eql(['bar', 'foo']);
    });

    it('should include url req params in the order: custom, element, session', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/attribute/baz`,
      });
      data.status.should.equal(0);
      data.value.should.eql(['baz', 'bar', 'foo']);
    });

    it('should respond with 400 Bad Request if parameters missing', async function () {
      const {data, status} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {},
        validateStatus: null,
      });
      status.should.equal(400);
      JSON.stringify(data).should.contain('url');
    });

    it('should reject requests with a badly formatted body and not crash', async function () {
      await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: 'oh hello'
      }).should.eventually.be.rejected;

      const {data} = await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {url: 'http://google.com'}
      });
      data.should.eql({
        status: 0,
        value: 'Navigated to: http://google.com',
        sessionId: 'foo'
      });

    });

    it('should get 404 for bad routes', async function () {
      await axios({
        url: `${baseUrl}/blargimarg`,
      }).should.eventually.be.rejectedWith(/404/);
    });

    // TODO pass this test
    // https://github.com/appium/node-mobile-json-wire-protocol/issues/3
    it('4xx responses should have content-type of text/plain', async function () {
      const {headers} = await axios({
        url: `${baseUrl}/blargimargarita`,
        validateStatus: null,
      });

      headers['content-type'].should.include('text/plain');
    });

    it('should throw not yet implemented for unfilledout commands', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/location`,
        validateStatus: null,
      });

      status.should.equal(501);
      data.should.eql({
        status: 405,
        value: {
          message: 'Method has not yet been implemented'
        },
        sessionId: 'foo'
      });
    });

    it('should throw not implemented for ignored commands', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/buttonup`,
        method: 'POST',
        validateStatus: null,
        data: {},
      });

      status.should.equal(501);
      data.should.eql({
        status: 405,
        value: {
          message: 'Method has not yet been implemented'
        },
        sessionId: 'foo'
      });
    });

    it('should get 400 for bad parameters', async function () {
      await axios({
        url: `${baseUrl}/session/foo/url`,
        method: 'POST',
        data: {}
      }).should.eventually.be.rejectedWith(/400/);
    });

    it('should ignore special extra payload params in the right contexts', async function () {
      await axios({
        url: `${baseUrl}/session/foo/element/bar/value`,
        method: 'POST',
        data: {id: 'baz', sessionId: 'lol', value: ['a']}
      });

      await axios({
        url: `${baseUrl}/session/foo/element/bar/value`,
        method: 'POST',
        data: {id: 'baz'}
      }).should.eventually.be.rejectedWith(/400/);

      // make sure adding the optional 'id' doesn't clobber a route where we
      // have an actual required 'id'
      await axios({
        url: `${baseUrl}/session/foo/frame`,
        method: 'POST',
        data: {id: 'baz'}
      });
    });

    it('should return the correct error even if driver does not throw', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/appium/receive_async_response`,
        method: 'POST',
        data: {response: 'baz'},
        validateStatus: null,
      });
      status.should.equal(500);
      data.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Mishandled Driver Error'
        },
        sessionId: 'foo'
      });
    });

    describe('w3c sendkeys migration', function () {
      it('should accept value for sendkeys', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {value: 'text to type'}
        });
        data.status.should.equal(0);
        data.value.should.eql(['text to type', 'bar']);
      });
      it('should accept text for sendkeys', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {text: 'text to type'}
        });
        data.status.should.equal(0);
        data.value.should.eql(['text to type', 'bar']);
      });
      it('should accept value and text for sendkeys, and use value', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/element/bar/value`,
          method: 'POST',
          data: {value: 'text to type', text: 'text to ignore'}
        });
        data.status.should.equal(0);
        data.value.should.eql(['text to type', 'bar']);
      });
    });

    describe('multiple sets of arguments', function () {
      describe('optional', function () {
        it('should allow moveto with element', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/moveto`,
            method: 'POST',
            data: {element: '3'}
          });
          data.status.should.equal(0);
          data.value.should.eql(['3', null, null]);
        });
        it('should allow moveto with xoffset/yoffset', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/moveto`,
            method: 'POST',
            data: {xoffset: 42, yoffset: 17}
          });
          data.status.should.equal(0);
          data.value.should.eql([null, 42, 17]);
        });
      });
      describe('required', function () {
        it('should allow removeApp with appId', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/appium/device/remove_app`,
            method: 'POST',
            data: {appId: 42}
          });
          data.status.should.equal(0);
          data.value.should.eql(42);
        });
        it('should allow removeApp with bundleId', async function () {
          const {data} = await axios({
            url: `${baseUrl}/session/foo/appium/device/remove_app`,
            method: 'POST',
            data: {bundleId: 42}
          });
          data.status.should.equal(0);
          data.value.should.eql(42);
        });
      });
    });

    describe('default param wrap', function () {
      it('should wrap', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/touch/perform`,
          method: 'POST',
          data: [{'action': 'tap', 'options': {'element': '3'}}]
        });
        data.value.should.deep.equal([[{'action': 'tap', 'options': {'element': '3'}}], 'foo']);
      });

      it('should not wrap twice', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session/foo/touch/perform`,
          method: 'POST',
          data: {actions: [{'action': 'tap', 'options': {'element': '3'}}]}
        });
        data.value.should.deep.equal([[{'action': 'tap', 'options': {'element': '3'}}], 'foo']);
      });

    });

    describe('create sessions via HTTP endpoint', function () {
      let desiredCapabilities = {a: 'b'};
      let requiredCapabilities = {c: 'd'};
      let capabilities = {e: 'f'};

      let sessionId;

      beforeEach(function () {
        sessionId = null;
      });
      afterEach(async function () {
        if (sessionId) {
          await axios.delete(`${baseUrl}/session/${sessionId}`);
        }
      });

      it('should allow create session with desired caps (MJSONWP)', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {desiredCapabilities}
        });
        sessionId = data.sessionId;

        data.status.should.equal(0);
        data.value.should.eql(desiredCapabilities);
      });
      it('should allow create session with desired and required caps', async function () {
        const {data} = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {
            desiredCapabilities,
            requiredCapabilities
          }
        });
        sessionId = data.sessionId;

        data.status.should.equal(0);
        data.value.should.eql(_.extend({}, desiredCapabilities, requiredCapabilities));
      });
      it('should fail to create session without capabilities or desiredCapabilities', async function () {
        await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {},
        }).should.eventually.be.rejectedWith(/400/);
      });
      it('should allow create session with capabilities (W3C)', async function () {
        // let {status, value, sessionId} = await request({
        const {data} = await axios({
          url: `${baseUrl}/session`,
          method: 'POST',
          data: {
            capabilities,
          }
        });
        sessionId = data.sessionId;

        should.not.exist(data.status);
        should.not.exist(data.sessionId);
        data.value.capabilities.should.eql(capabilities);
        data.value.sessionId.should.exist;
      });
      it('should fall back to MJSONWP if driver does not support W3C yet', async function () {
        const createSessionStub = sinon.stub(driver, 'createSession').callsFake(function (capabilities) {
          driver.sessionId = null;
          return BaseDriver.prototype.createSession.call(driver, capabilities);
        });
        try {
          let caps = {
            ...desiredCapabilities,
            platformName: 'Fake',
            deviceName: 'Fake',
          };
          // let {status, value, sessionId} = await request({
          const {data} = await axios({
            url: `${baseUrl}/session`,
            method: 'POST',
            data: {
              desiredCapabilities: caps,
              capabilities: {
                alwaysMatch: caps,
                firstMatch: [{}],
              },
            }
          });
          sessionId = data.sessionId;

          should.exist(data.status);
          should.exist(data.sessionId);
          data.value.should.eql(caps);
        } finally {
          createSessionStub.restore();
        }
      });

      describe('w3c endpoints', function () {
        let w3cCaps = {
          alwaysMatch: {
            platformName: 'Fake',
            deviceName: 'Commodore 64',
          },
          firstMatch: [{}],
        };
        let sessionUrl;

        beforeEach(async function () {
          // Start a W3C session
          const {value} = (await axios({
            url: `${baseUrl}/session`,
            method: 'POST',
            data: {
              capabilities: w3cCaps,
            },
          })).data;
          sessionId = value.sessionId;
          sessionUrl = `${baseUrl}/session/${sessionId}`;
        });

        it(`should throw 400 Bad Parameters exception if the parameters are bad`, async function () {
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              bad: 'params',
            }
          });
          status.should.equal(400);

          const {error: w3cError, message, stacktrace} = data.value;
          message.should.match(/Parameters were incorrect/);
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.InvalidArgumentError.error());
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
          status.should.equal(405);

          const {error: w3cError, message, stacktrace} = data.value;
          message.should.match(/Method has not yet been implemented/);
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.NotYetImplementedError.error());
          message.should.match(/Method has not yet been implemented/);
        });

        it(`should throw 500 Unknown Error if the command throws an unexpected exception`, async function () {
          driver.performActions = () => { throw new Error(`Didn't work`); };
          const {status, data} = await axios({
            url: `${sessionUrl}/actions`,
            method: 'POST',
            validateStatus: null,
            data: {
              actions: [],
            }
          });
          status.should.equal(500);

          const {error: w3cError, message, stacktrace} = data.value;
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.UnknownError.error());
          message.should.match(/Didn't work/);

          delete driver.performActions;
        });

        it(`should translate element format from MJSONWP to W3C`, async function () {
          const retValue = [
            {
              something: {
                [MJSONWP_ELEMENT_KEY]: 'fooo',
                other: 'bar'
              }
            }, {
              [MJSONWP_ELEMENT_KEY]: 'bar'
            },
            'ignore',
          ];

          const expectedValue = [
            {
              something: {
                [MJSONWP_ELEMENT_KEY]: 'fooo',
                [W3C_ELEMENT_KEY]: 'fooo',
                other: 'bar'
              }
            }, {
              [MJSONWP_ELEMENT_KEY]: 'bar',
              [W3C_ELEMENT_KEY]: 'bar'
            },
            'ignore',
          ];

          const findElementsBackup = driver.findElements;
          driver.findElements = () => retValue;
          const {data} = await axios.post(`${sessionUrl}/elements`, {
            using: 'whatever',
            value: 'whatever',
          });
          data.value.should.eql(expectedValue);
          driver.findElements = findElementsBackup;
        });

        it(`should fail with a 408 error if it throws a TimeoutError exception`, async function () {
          let setUrlStub = sinon.stub(driver, 'setUrl').callsFake(function () {
            throw new errors.TimeoutError;
          });
          const {status, data} = await axios({
            url: `${sessionUrl}/url`,
            method: 'POST',
            validateStatus: null,
            data: {
              url: 'https://example.com/',
            }
          });
          status.should.equal(408);

          const {error: w3cError, message, stacktrace} = data.value;
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.TimeoutError.error());
          message.should.match(/An operation did not complete before its timeout expired/);

          setUrlStub.restore();
        });

        it(`should pass with 200 HTTP status code if the command returns a value`, async function () {
          driver.performActions = (actions) => 'It works ' + actions.join('');
          const {status, value, sessionId} = (await axios.post(`${sessionUrl}/actions`, {
            actions: ['a', 'b', 'c'],
          })).data;
          should.not.exist(sessionId);
          should.not.exist(status);
          value.should.equal('It works abc');
          delete driver.performActions;
        });

        describe('jwproxy', function () {
          const port = 56562;
          let server, jwproxy, app;

          beforeEach(function () {
            const res = createProxyServer(sessionId, port);
            server = res.server;
            app = res.app;
            jwproxy = new JWProxy({host: 'localhost', port});
            jwproxy.sessionId = sessionId;
            driver.performActions = async (actions) => await jwproxy.command('/perform-actions', 'POST', actions);
          });

          afterEach(async function () {
            delete driver.performActions;
            await server.close();
          });

          it('should work if a proxied request returns a response with status 200', async function () {
            app.post('/wd/hub/session/:sessionId/perform-actions', (req, res) => {
              res.json({
                sessionId: req.params.sessionId,
                value: req.body,
                status: 0,
              });
            });

            const {status, value, sessionId} = (await axios.post(`${sessionUrl}/actions`, {
              actions: [1, 2, 3],
            })).data;
            value.should.eql([1, 2, 3]);
            should.not.exist(status);
            should.not.exist(sessionId);
          });

          it('should return error if a proxied request returns a MJSONWP error response', async function () {
            app.post('/wd/hub/session/:sessionId/perform-actions', (req, res) => {
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
              }
            });
            status.should.equal(HTTPStatusCodes.NOT_FOUND);
            JSON.stringify(data).should.match(/A problem occurred/);
          });

          it('should return W3C error if a proxied request returns a W3C error response', async function () {
            const error = new Error(`Some error occurred`);
            error.w3cStatus = 414;
            const executeCommandStub = sinon.stub(driver, 'executeCommand').returns({
              protocol: 'W3C',
              error,
            });
            const {status, data} = await axios({
              url: `${sessionUrl}/actions`,
              method: 'POST',
              validateStatus: null,
              data: {actions: [1, 2, 3]},
            });
            status.should.equal(414);
            const {error: w3cError, message: errMessage, stacktrace} = data.value;
            w3cError.should.equal('unknown error');
            stacktrace.should.match(/Some error occurred/);
            errMessage.should.equal('Some error occurred');
            executeCommandStub.restore();
          });

          it('should return error if a proxied request returns a MJSONWP error response but HTTP status code is 200', async function () {
            app.post('/wd/hub/session/:sessionId/perform-actions', (req, res) => {
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
              }
            });
            status.should.equal(HTTPStatusCodes.NOT_FOUND);
            const {error: w3cError, message: errMessage, stacktrace} = data.value;
            w3cError.should.equal('no such element');
            errMessage.should.match(/A problem occurred/);
            stacktrace.should.exist;
          });

          it('should return error if a proxied request returns a W3C error response', async function () {
            app.post('/wd/hub/session/:sessionId/perform-actions', (req, res) => {
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
              }
            });
            status.should.equal(HTTPStatusCodes.NOT_FOUND);
            const {error: w3cError, stacktrace} = data.value;
            w3cError.should.equal('no such element');
            stacktrace.should.match(/arbitrary stacktrace/);
          });

          it('should return an error if a proxied request returns a W3C error response', async function () {
            app.post('/wd/hub/session/:sessionId/perform-actions', (req, res) => {
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
              }
            });
            status.should.equal(HTTPStatusCodes.INTERNAL_SERVER_ERROR);
            const {error: w3cError, stacktrace} = data.value;
            w3cError.should.equal('unknown error');
            stacktrace.should.match(/arbitrary stacktrace/);
          });

        });
      });
    });

    it('should handle commands with no response values', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/forward`,
        method: 'POST',
      });
      data.should.eql({
        status: 0,
        value: null,
        sessionId: 'foo'
      });
    });

    it('should allow empty string response values', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session/foo/element/bar/text`,
      });
      data.should.eql({
        status: 0,
        value: '',
        sessionId: 'foo'
      });
    });

    it('should send 500 response and an Unknown object for rejected commands', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo/refresh`,
        method: 'POST',
        validateStatus: null,
      });

      status.should.equal(500);
      data.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Too Fresh!'
        },
        sessionId: 'foo'
      });
    });

    it('should not throw UnknownError when known', async function () {
      const {status, data} = await axios({
        url: `${baseUrl}/session/foo`,
        validateStatus: null,
      });

      status.should.equal(404);
      data.should.eql({
        status: 6,
        value: {
          message: 'A session is either terminated or not started'
        },
        sessionId: 'foo'
      });
    });
  });

  describe('session Ids', function () {
    let driver = new FakeDriver();
    let mjsonwpServer;

    before(async function () {
      mjsonwpServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver),
        port: serverPort,
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

      should.equal(data.sessionId, null);
    });

    it('responds with the same session ID in the request', async function () {
      let sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      const {data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'}
      });

      should.exist(data.sessionId);
      data.sessionId.should.eql(sessionId);
    });

    it('yells if no session exists', async function () {
      let sessionId = 'Vader Sessions';

      const {data, status} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      status.should.equal(404);
      data.status.should.equal(6);
      data.value.message.should.contain('session');
    });

    it('yells if invalid session is sent', async function () {
      let sessionId = 'Vader Sessions';
      driver.sessionId = 'recession';

      const {data, status} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      status.should.equal(404);
      data.status.should.equal(6);
      data.value.message.should.contain('session');
    });

    it('should have session IDs in error responses', async function () {
      let sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      const {data, status} = await axios({
        url: `${baseUrl}/session/${sessionId}/refresh`,
        method: 'POST',
        validateStatus: null,
      });

      status.should.equal(500);
      data.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Too Fresh!'
        },
        sessionId
      });
    });

    it('should return a new session ID on create', async function () {
      const {data} = await axios({
        url: `${baseUrl}/session`,
        method: 'POST',
        data: {desiredCapabilities: {greeting: 'hello'}, requiredCapabilities: {valediction: 'bye'}}
      });

      should.exist(data.sessionId);
      data.sessionId.indexOf('fakeSession_').should.equal(0);
      data.value.should.eql({greeting: 'hello', valediction: 'bye'});
    });
  });

  describe('via drivers jsonwp proxy', function () {
    let driver;
    let sessionId = 'foo';
    let mjsonwpServer;

    beforeEach(async function () {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      driver.proxyActive = () => true;
      driver.canProxy = () => true;

      mjsonwpServer = await server({
        routeConfiguringFunction: routeConfiguringFunction(driver),
        port: serverPort,
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

      status.should.equal(500);
      data.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Trying to proxy to a JSONWP ' +
                   'server but driver is unable to proxy'
        },
        sessionId
      });
    });

    it('should pass on any errors in proxying', async function () {
      driver.proxyReqRes = async function () { // eslint-disable-line require-await
        throw new Error('foo');
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      status.should.equal(500);
      data.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Could not proxy. Proxy ' +
                   'error: foo'
        },
        sessionId
      });
    });

    it('should able to throw ProxyRequestError in proxying', async function () {
      driver.proxyReqRes = async function () { // eslint-disable-line require-await
        let jsonwp = {status: 35, value: 'No such context found.', sessionId: 'foo'};
        throw new errors.ProxyRequestError(`Could not proxy command to remote server. `, jsonwp);
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        validateStatus: null,
        data: {url: 'http://google.com'},
      });

      status.should.equal(500);
      data.should.eql({
        status: 35,
        value: {
          message: 'No such context found.'
        },
        sessionId: 'foo'
      });
    });

    it('should let the proxy handle req/res', async function () {
      driver.proxyReqRes = async function (req, res) { // eslint-disable-line require-await
        res.status(200).json({custom: 'data'});
      };
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'}
      });

      status.should.equal(200);
      data.should.eql({custom: 'data'});
    });

    it('should avoid jsonwp proxying when path matches avoidance list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('^/session/[^/]+/url$')]];
      const {status, data} = await axios({
        url: `${baseUrl}/session/${sessionId}/url`,
        method: 'POST',
        data: {url: 'http://google.com'},
      });

      status.should.equal(200);
      data.should.eql({
        status: 0,
        value: 'Navigated to: http://google.com',
        sessionId
      });
    });

    it('should fail if avoid proxy list is malformed in some way', async function () {
      async function badProxyAvoidanceList (list) {
        driver.getProxyAvoidList = () => list;
        const {status, data} = await axios({
          url: `${baseUrl}/session/${sessionId}/url`,
          method: 'POST',
          validateStatus: null,
          data: {url: 'http://google.com'},
        });

        status.should.equal(500);
        data.status.should.equal(13);
        data.value.message.should.contain('roxy');
      }
      const lists = [
        'foo',
        [['foo']],
        [['BAR', /lol/]],
        [['GET', 'foo']]
      ];
      for (let list of lists) {
        await badProxyAvoidanceList(list);
      }
    });

    it('should avoid proxying non-session commands even if not in the list', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      const {status, data} = await axios({
        url: `${baseUrl}/status`,
      });

      status.should.equal(200);
      data.should.eql({
        status: 0,
        value: "I'm fine",
        sessionId: null
      });
    });

    it('should avoid proxying deleteSession commands', async function () {
      driver.getProxyAvoidList = () => [['POST', new RegExp('')]];

      driver.sessionId.should.equal(sessionId);
      const {status} = await axios.delete(`${baseUrl}/session/${sessionId}`);

      status.should.equal(200);
      should.not.exist(driver.sessionId);
      driver.jwpProxyActive.should.be.false;
    });
  });
});
