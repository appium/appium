// transpile:mocha

import { server, routeConfiguringFunction, errors, JWProxy, BaseDriver } from '../..';
import { FakeDriver } from './fake-driver';
import _ from 'lodash';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import HTTPStatusCodes from 'http-status-codes';
import { createProxyServer, addHandler } from './helpers';
import { MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY } from '../../lib/protocol/protocol';

let should = chai.should();
chai.use(chaiAsPromised);

describe('Protocol', async function () {

  //TODO: more tests!:
  // Unknown commands should return 404

  describe('direct to driver', function () {
    let d = new FakeDriver();
    it('should return response values directly from the driver', async function () {
      (await d.setUrl("http://google.com")).should.contain("google");
    });
  });

  describe('via express router', function () {
    let mjsonwpServer;
    let driver;

    before(async function () {
      driver = new FakeDriver();
      driver.sessionId = 'foo';
      mjsonwpServer = await server(routeConfiguringFunction(driver), 8181);
    });

    after(async function () {
      mjsonwpServer.close();
    });

    it('should proxy to driver and return valid jsonwp response', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        json: {url: 'http://google.com'}
      });
      res.should.eql({
        status: 0,
        value: "Navigated to: http://google.com",
        sessionId: "foo"
      });
    });

    it('should assume requests without a Content-Type are json requests', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        body: JSON.stringify({url: 'http://google.com'}),
      });
      JSON.parse(res).should.eql({
        status: 0,
        value: "Navigated to: http://google.com",
        sessionId: "foo"
      });
    });

    it('should respond to x-www-form-urlencoded as well as json requests', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        form: {url: 'http://google.com'}
      });
      JSON.parse(res).should.eql({
        status: 0,
        value: "Navigated to: http://google.com",
        sessionId: "foo"
      });
    });

    it('should include url request parameters for methods to use - sessionid', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/back',
        method: 'POST',
        json: {},
        simple: false,
        resolveWithFullResponse: true
      });
      res.body.should.eql({
        status: 0,
        value: "foo",
        sessionId: "foo"
      });
    });

    it('should include url request parameters for methods to use - elementid', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/click',
        method: 'POST',
        json: {}
      });
      res.status.should.equal(0);
      res.value.should.eql(["bar", "foo"]);
    });

    it('should include url req params in the order: custom, element, session', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/attribute/baz',
        method: 'GET',
        json: {}
      });
      res.status.should.equal(0);
      res.value.should.eql(["baz", "bar", "foo"]);

    });

    it('should respond with 400 Bad Request if parameters missing', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        json: {},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(400);
      res.body.should.contain("url");
    });

    it('should reject requests with a badly formatted body and not crash', async function () {
      await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        json: "oh hello"
      }).should.eventually.be.rejected;

      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        json: {url: 'http://google.com'}
      });
      res.should.eql({
        status: 0,
        value: "Navigated to: http://google.com",
        sessionId: "foo"
      });

    });

    it('should get 404 for bad routes', async function () {
      await request({
        url: 'http://localhost:8181/wd/hub/blargimarg',
        method: 'GET'
      }).should.eventually.be.rejectedWith("404");
    });

    // TODO pass this test
    // https://github.com/appium/node-mobile-json-wire-protocol/issues/3
    it('4xx responses should have content-type of text/plain', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/blargimargarita',
        method: 'GET',
        resolveWithFullResponse: true,
        simple: false // 404 errors fulfill the promise, rather than rejecting
      });

      res.headers['content-type'].should.include('text/plain');
    });

    it('should throw not yet implemented for unfilledout commands', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/location',
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(501);
      res.body.should.eql({
        status: 13,
        value: {
          message: 'Method has not yet been implemented'
        },
        sessionId: 'foo'
      });
    });

    it('should throw not implemented for ignored commands', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/buttonup',
        method: 'POST',
        json: {},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(501);
      res.body.should.eql({
        status: 13,
        value: {
          message: 'Method is not implemented'
        },
        sessionId: 'foo'
      });
    });

    it('should get 400 for bad parameters', async function () {
      await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        json: {}
      }).should.eventually.be.rejectedWith("400");
    });

    it('should ignore special extra payload params in the right contexts', async function () {
      await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/value',
        method: 'POST',
        json: {id: 'baz', sessionId: 'lol', value: ['a']}
      });

      await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/value',
        method: 'POST',
        json: {id: 'baz'}
      }).should.eventually.be.rejectedWith("400");

      // make sure adding the optional 'id' doesn't clobber a route where we
      // have an actual required 'id'
      await request({
        url: 'http://localhost:8181/wd/hub/session/foo/frame',
        method: 'POST',
        json: {id: 'baz'}
      });
    });

    it('should return the correct error even if driver does not throw', async function () {
      let res =  await request({
        url: 'http://localhost:8181/wd/hub/session/foo/appium/receive_async_response',
        method: 'POST',
        json: {response: 'baz'},
        resolveWithFullResponse: true,
        simple: false
      });
      res.statusCode.should.equal(500);
      res.body.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Mishandled Driver Error'
        },
        sessionId: "foo"
      });
    });

    describe('w3c sendkeys migration', function () {
      it('should accept value for sendkeys', async function () {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/element/bar/value',
          method: 'POST',
          json: {value: "text to type"}
        });
        res.status.should.equal(0);
        res.value.should.eql(["text to type", "bar"]);
      });
      it('should accept text for sendkeys', async function () {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/element/bar/value',
          method: 'POST',
          json: {text: "text to type"}
        });
        res.status.should.equal(0);
        res.value.should.eql(["text to type", "bar"]);
      });
      it('should accept value and text for sendkeys, and use value', async function () {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/element/bar/value',
          method: 'POST',
          json: {value: "text to type", text: "text to ignore"}
        });
        res.status.should.equal(0);
        res.value.should.eql(["text to type", "bar"]);
      });
    });

    describe('multiple sets of arguments', function () {
      describe('optional', function () {
        it('should allow moveto with element', async function () {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/moveto',
            method: 'POST',
            json: {element: '3'}
          });
          res.status.should.equal(0);
          res.value.should.eql(['3', null, null]);
        });
        it('should allow moveto with xoffset/yoffset', async function () {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/moveto',
            method: 'POST',
            json: {xoffset: 42, yoffset: 17}
          });
          res.status.should.equal(0);
          res.value.should.eql([null, 42, 17]);
        });
      });
      describe('required', function () {
        it('should allow removeApp with appId', async function () {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/appium/device/remove_app',
            method: 'POST',
            json: {appId: 42}
          });
          res.status.should.equal(0);
          res.value.should.eql(42);
        });
        it('should allow removeApp with bundleId', async function () {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/appium/device/remove_app',
            method: 'POST',
            json: {bundleId: 42}
          });
          res.status.should.equal(0);
          res.value.should.eql(42);
        });
      });
    });

    describe('default param wrap', function () {

      it('should wrap', async function () {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/touch/perform',
          method: 'POST',
          json: [{"action":"tap", "options":{"element":"3"}}]
        });
        res.value.should.deep.equal([[{"action":"tap", "options":{"element":"3"}}], 'foo']);
      });

      it('should not wrap twice', async function () {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/touch/perform',
          method: 'POST',
          json: {actions: [{"action":"tap", "options":{"element":"3"}}]}
        });
        res.value.should.deep.equal([[{"action":"tap", "options":{"element":"3"}}], 'foo']);
      });

    });

    describe('create sessions via HTTP endpoint', function () {
      let desiredCapabilities = {a: 'b'};
      let requiredCapabilities = {c: 'd'};
      let capabilities = {e: 'f'};
      let baseUrl = `http://localhost:8181/wd/hub/session`;

      it('should allow create session with desired caps (MJSONWP)', async function () {
        let res = await request({
          url: baseUrl,
          method: 'POST',
          json: {desiredCapabilities}
        });
        res.status.should.equal(0);
        res.value.should.eql(desiredCapabilities);
      });
      it('should allow create session with desired and required caps', async function () {
        let res = await request({
          url: baseUrl,
          method: 'POST',
          json: {
            desiredCapabilities,
            requiredCapabilities
          }
        });
        res.status.should.equal(0);
        res.value.should.eql(_.extend({}, desiredCapabilities, requiredCapabilities));
      });
      it('should fail to create session without capabilities or desiredCapabilities', async function () {
        await request({
          url: baseUrl,
          method: 'POST',
          json: {},
        }).should.eventually.be.rejectedWith('400');
      });
      it('should allow create session with capabilities (W3C)', async function () {
        let {status, value, sessionId} = await request({
          url: baseUrl,
          method: 'POST',
          json: {
            capabilities,
          }
        });
        should.not.exist(status);
        should.not.exist(sessionId);
        value.capabilities.should.eql(capabilities);
        value.sessionId.should.exist;
      });
      it('should fall back to MJSONWP if driver does not support W3C yet', async function () {
        const createSessionStub = sinon.stub(driver, 'createSession', (capabilities) => {
          driver.sessionId = null;
          return BaseDriver.prototype.createSession.call(driver, capabilities);
        });
        let caps = {
          ...desiredCapabilities,
          platformName: 'Fake',
          deviceName: 'Fake',
        };
        let {status, value, sessionId} = await request({
          url: baseUrl,
          method: 'POST',
          json: {
            desiredCapabilities: caps,
            capabilities: {
              alwaysMatch: caps,
              firstMatch: [{}],
            },
          }
        });
        should.exist(status);
        should.exist(sessionId);
        value.should.eql(caps);
        createSessionStub.restore();
      });

      describe('w3c endpoints', async function () {
        let w3cCaps = {
          alwaysMatch: {
            platformName: 'Fake',
            deviceName: 'Commodore 64',
          },
          firstMatch: [{}],
        };
        let sessionUrl;
        let sessionId;

        beforeEach(async function () {
          // Start a session
          let {value} = await request.post(baseUrl, {
            json: {
              capabilities: w3cCaps,
            }
          });
          sessionId = value.sessionId;
          sessionUrl = `${baseUrl}/${sessionId}`;
        });

        afterEach(async function () {
          // Delete the session
          await request.delete(sessionUrl);
        });

        it(`should throw 400 Bad Parameters exception if the parameters are bad`, async function () {
          const {statusCode, error} = await request.post(`${sessionUrl}/actions`, {
            json: {
              bad: 'params',
            }
          }).should.eventually.be.rejected;
          statusCode.should.equal(400);

          const {error:w3cError, message, stacktrace} = error.value;
          message.should.match(/Parameters were incorrect/);
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.InvalidArgumentError.error());
        });

        it(`should throw 404 Not Found exception if the command hasn't been implemented yet`, async function () {
          const {statusCode, error} = await request.post(`${sessionUrl}/actions`, {
            json: {
              actions: [],
            }
          }).should.eventually.be.rejected;
          statusCode.should.equal(404);

          const {error:w3cError, message, stacktrace} = error.value;
          message.should.match(/Method has not yet been implemented/);
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.NotYetImplementedError.error());
          message.should.match(/Method has not yet been implemented/);
        });

        it(`should throw 500 Unknown Error if the command throws an unexpected exception`, async function () {
          driver.performActions = () => { throw new Error(`Didn't work`); };
          const {statusCode, error} = await request.post(`${sessionUrl}/actions`, {
            json: {
              actions: [],
            }
          }).should.eventually.be.rejected;
          statusCode.should.equal(500);

          const {error:w3cError, message, stacktrace} = error.value;
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
                [W3C_ELEMENT_KEY]: 'fooo',
                other: 'bar'
              }
            }, {
              [W3C_ELEMENT_KEY]: 'bar'
            },
            'ignore',
          ];

          const findElementsBackup = driver.findElements;
          driver.findElements = () => retValue;
          const {value} = await request.post(`${sessionUrl}/elements`, {
            json: {
              using: 'whatever',
              value: 'whatever',
            },
          });
          value.should.deep.equal(expectedValue);
          driver.findElements = findElementsBackup;
        });

        it(`should fail with a 408 error if it throws a TimeoutError exception`, async function () {
          sinon.stub(driver, 'setUrl', () => { throw new errors.TimeoutError; });
          let {statusCode, error} = await request({
            url: `${sessionUrl}/url`,
            method: 'POST',
            json: {
              url: 'https://example.com/',
            }
          }).should.eventually.be.rejected;
          statusCode.should.equal(408);

          const {error:w3cError, message, stacktrace} = error.value;
          stacktrace.should.match(/protocol.js/);
          w3cError.should.be.a.string;
          w3cError.should.equal(errors.TimeoutError.error());
          message.should.match(/An operation did not complete before its timeout expired/);

          sinon.restore(driver, 'setUrl');
        });

        it(`should pass with 200 HTTP status code if the command returns a value`, async function () {
          driver.performActions = (actions) => 'It works ' + actions.join('');
          const {status, value, sessionId} = await request.post(`${sessionUrl}/actions`, {
            json: {
              actions: ['a', 'b', 'c'],
            }
          });
          should.not.exist(sessionId);
          should.not.exist(status);
          value.should.equal('It works abc');
          delete driver.performActions;
        });

        describe('jwproxy', function () {
          let port = 56562;
          let server, jwproxy, app;
          beforeEach(function () {
            let res = createProxyServer(sessionId, port);
            server = res.server;
            app = res.app;
            jwproxy = new JWProxy({host: 'localhost', port});
            jwproxy.sessionId = sessionId;
            driver.performActions = async (actions) => await jwproxy.command('/perform-actions', 'POST', actions);
          });

          afterEach(function () {
            server.close();
            delete driver.performActions;
          });

          it('should work if a proxied request returns a response with status 200', async function () {
            addHandler(app, 'post', '/wd/hub/session/:sessionId/perform-actions', (req, res) => {
              res.json({
                sessionId: req.params.sessionId,
                value: req.body,
                status: 0,
              });
            });

            const {status, value, sessionId} = await request.post(`${sessionUrl}/actions`, {
              json: {
                actions: [1, 2, 3],
              },
            });
            value.should.eql([1, 2, 3]);
            should.not.exist(status);
            should.not.exist(sessionId);
          });

          it('should return error if a proxied request returns a MJSONWP error response', async function () {
            addHandler(app, 'post', '/wd/hub/session/:sessionId/perform-actions', (req, res) => {
              res.status(500).json({
                sessionId,
                status: 6,
                value: 'A problem occurred',
              });
            });
            const {statusCode, message} = await request.post(`${sessionUrl}/actions`, {
              json: {
                actions: [1, 2, 3],
              }
            }).should.eventually.be.rejected;
            statusCode.should.equal(HTTPStatusCodes.NOT_FOUND);
            message.should.match(/A problem occurred/);
          });

          it('should return error if a proxied request returns a MJSONWP error response but HTTP status code is 200', async function () {
            addHandler(app, 'post', '/wd/hub/session/:sessionId/perform-actions', (req, res) => {
              res.status(200).json({
                sessionId: 'Fake Session Id',
                status: 7,
                value: 'A problem occurred',
              });
            });
            const {statusCode, message, error} = await request.post(`${sessionUrl}/actions`, {
              json: {
                actions: [1, 2, 3],
              }
            }).should.eventually.be.rejected;
            statusCode.should.equal(HTTPStatusCodes.NOT_FOUND);
            message.should.match(/A problem occurred/);
            const {error:w3cError, message:errMessage, stacktrace} = error.value;
            w3cError.should.equal('no such element');
            errMessage.should.match(/A problem occurred/);
            stacktrace.should.exist;
          });

          it('should return error if a proxied request returns a W3C error response', async function () {
            addHandler(app, 'post', '/wd/hub/session/:sessionId/perform-actions', (req, res) => {
              res.status(404).json({
                value: {
                  error: 'no such element',
                  message: 'does not make a difference',
                  stacktrace: 'arbitrary stacktrace',
                },
              });
            });
            const {statusCode, message, error} = await request.post(`${sessionUrl}/actions`, {
              json: {
                actions: [1, 2, 3],
              }
            }).should.eventually.be.rejected;
            statusCode.should.equal(HTTPStatusCodes.NOT_FOUND);
            message.should.match(/does not make a difference/);
            const {error:w3cError, stacktrace} = error.value;
            w3cError.should.equal('no such element');
            stacktrace.should.match(/arbitrary stacktrace/);
          });

          it('should return an error if a proxied request returns a W3C error response', async function () {
            addHandler(app, 'post', '/wd/hub/session/:sessionId/perform-actions', (req, res) => {
              res.status(444).json({
                value: {
                  error: 'bogus error code',
                  message: 'does not make a difference',
                  stacktrace: 'arbitrary stacktrace',
                },
              });
            });
            const {statusCode, message, error} = await request.post(`${sessionUrl}/actions`, {
              json: {
                actions: [1, 2, 3],
              }
            }).should.eventually.be.rejected;
            statusCode.should.equal(HTTPStatusCodes.INTERNAL_SERVER_ERROR);
            message.should.match(/does not make a difference/);
            const {error:w3cError, stacktrace} = error.value;
            w3cError.should.equal('unknown error');
            stacktrace.should.match(/arbitrary stacktrace/);
          });
        });
      });
    });

    it('should handle commands with no response values', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/forward',
        method: 'POST',
        json: true,
      });
      res.should.eql({
        status: 0,
        value: null,
        sessionId: "foo"
      });
    });

    it('should allow empty string response values', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/text',
        method: 'GET',
        json: true,
      });
      res.should.eql({
        status: 0,
        value: "",
        sessionId: "foo"
      });
    });

    it('should send 500 response and an Unknown object for rejected commands', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/refresh',
        method: 'POST',
        json: true,
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(500);
      res.body.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Too Fresh!'
        },
        sessionId: "foo"
      });
    });

    it('should not throw UnknownError when known', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo',
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(404);
      res.body.should.eql({
        status: 6,
        value: {
          message: 'A session is either terminated or not started'
        },
        sessionId: "foo"
      });
    });
  });

  describe('session Ids', function () {
    let driver = new FakeDriver();
    let mjsonwpServer;

    before(async function () {
      mjsonwpServer = await server(routeConfiguringFunction(driver), 8181);
    });

    after(async function () {
      mjsonwpServer.close();
    });

    afterEach(function () {
      driver.sessionId = null;
    });

    it('returns null SessionId for commands without sessionIds', async function () {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/status',
        method: 'GET',
        json: true,
      });

      should.equal(res.sessionId, null);
    });

    it('responds with the same session ID in the request', async function () {
      let sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'}
      });

      should.exist(res.sessionId);
      res.sessionId.should.eql(sessionId);
    });

    it('yells if no session exists', async function () {
      let sessionId = 'Vader Sessions';

      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(404);
      res.body.status.should.equal(6);
      res.body.value.message.should.contain('session');
    });

    it('yells if invalid session is sent', async function () {
      let sessionId = 'Vader Sessions';
      driver.sessionId = 'recession';

      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(404);
      res.body.status.should.equal(6);
      res.body.value.message.should.contain('session');
    });

    it('should have session IDs in error responses', async function () {
      let sessionId = 'Vader Sessions';
      driver.sessionId = sessionId;

      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/refresh`,
        method: 'POST',
        json: true,
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(500);
      res.body.should.eql({
        status: 13,
        value: {
          message: 'An unknown server-side error occurred while processing ' +
                   'the command. Original error: Too Fresh!'
        },
        sessionId
      });
    });

    it('should return a new session ID on create', async function () {

      let res = await request({
        url: 'http://localhost:8181/wd/hub/session',
        method: 'POST',
        json: {desiredCapabilities: {greeting: 'hello'}, requiredCapabilities: {valediction: 'bye'}}
      });

      should.exist(res.sessionId);
      res.sessionId.should.equal('1234');
      res.value.should.eql({greeting: 'hello', valediction: 'bye'});
    });
  });

  describe('via drivers jsonwp proxy', function () {
    let driver;
    let sessionId = 'foo';
    let mjsonwpServer;

    beforeEach(async function () {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      driver.proxyActive = () => { return true; };
      driver.canProxy = () => { return true; };

      mjsonwpServer = await server(routeConfiguringFunction(driver), 8181);
    });

    afterEach(async function () {
      mjsonwpServer.close();
    });

    it('should give a nice error if proxying is set but no proxy function exists', async function () {
      driver.canProxy = () => { return false; };
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(500);
      res.body.should.eql({
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
      driver.proxyReqRes = async function () {
        throw new Error("foo");
      };
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(500);
      res.body.should.eql({
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
      driver.proxyReqRes = async function () {
        let jsonwp = {status: 35, value: "No such context found.", sessionId: "foo"};
        throw  new errors.ProxyRequestError(`Could not proxy command to remote server. `, jsonwp);
      };
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(500);
      res.body.should.eql({
        status: 35,
        "value": { "message": "No such context found."},
        sessionId: "foo"
      });
    });

    it('should let the proxy handle req/res', async function () {
      driver.proxyReqRes = async function (req, res) {
        res.status(200).json({custom: 'data'});
      };
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(200);
      res.body.should.eql({custom: 'data'});
    });

    it('should avoid jsonwp proxying when path matches avoidance list', async function () {
      driver.getProxyAvoidList = () => { return [['POST', new RegExp('^/session/[^/]+/url$')]]; };
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
        method: 'POST',
        json: {url: 'http://google.com'},
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(200);
      res.body.should.eql({
        status: 0,
        value: "Navigated to: http://google.com",
        sessionId
      });
    });

    it('should fail if avoid proxy list is malformed in some way', async function () {
      async function badProxyAvoidanceList (list) {
        driver.getProxyAvoidList = () => { return list; };
        let res = await request({
          url: `http://localhost:8181/wd/hub/session/${sessionId}/url`,
          method: 'POST',
          json: {url: 'http://google.com'},
          resolveWithFullResponse: true,
          simple: false
        });

        res.statusCode.should.equal(500);
        res.body.status.should.equal(13);
        res.body.value.message.should.contain("roxy");
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
      driver.getProxyAvoidList = () => { return [['POST', new RegExp('')]]; };

      let res = await request({
        url: `http://localhost:8181/wd/hub/status`,
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(200);
      res.body.should.eql({
        status: 0,
        value: "I'm fine",
        sessionId: null
      });
    });

    it('should avoid proxying deleteSession commands', async function () {
      driver.getProxyAvoidList = () => { return [['POST', new RegExp('')]]; };

      driver.sessionId.should.equal(sessionId);
      let res = await request({
        url: `http://localhost:8181/wd/hub/session/${sessionId}`,
        method: 'DELETE',
        json: true,
        resolveWithFullResponse: true,
        simple: false
      });

      res.statusCode.should.equal(200);
      should.not.exist(driver.sessionId);
      driver.jwpProxyActive.should.be.false;
    });
  });
});
