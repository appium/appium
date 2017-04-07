// transpile:mocha

import { server, routeConfiguringFunction, errors } from '../..';
import { FakeDriver } from './fake-driver';
import _ from 'lodash';
import request from 'request-promise';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

let should = chai.should();
chai.use(chaiAsPromised);

describe('MJSONWP', async () => {

  //TODO: more tests!:
  // Unknown commands should return 404

  describe('direct to driver', () => {
    let d = new FakeDriver();
    it('should return response values directly from the driver', async () => {
      (await d.setUrl("http://google.com")).should.contain("google");
    });
  });

  describe('via express router', () => {
    let mjsonwpServer;
    let driver;

    before(async () => {
      driver = new FakeDriver();
      driver.sessionId = 'foo';
      mjsonwpServer = await server(routeConfiguringFunction(driver), 8181);
    });

    after(async () => {
      mjsonwpServer.close();
    });

    it('should proxy to driver and return valid jsonwp response', async () => {
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

    it('should assume requests without a Content-Type are json requests', async () => {
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

    it('should respond to x-www-form-urlencoded as well as json requests', async () => {
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

    it('should include url request parameters for methods to use - sessionid', async () => {
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

    it('should include url request parameters for methods to use - elementid', async () => {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/click',
        method: 'POST',
        json: {}
      });
      res.status.should.equal(0);
      res.value.should.eql(["bar", "foo"]);
    });

    it('should include url req params in the order: custom, element, session', async () => {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/session/foo/element/bar/attribute/baz',
        method: 'GET',
        json: {}
      });
      res.status.should.equal(0);
      res.value.should.eql(["baz", "bar", "foo"]);

    });

    it('should respond with 400 Bad Request if parameters missing', async () => {
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

    it('should reject requests with a badly formatted body and not crash', async () => {
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

    it('should get 404 for bad routes', async () => {
      await request({
        url: 'http://localhost:8181/wd/hub/blargimarg',
        method: 'GET'
      }).should.eventually.be.rejectedWith("404");
    });

    // TODO pass this test
    // https://github.com/appium/node-mobile-json-wire-protocol/issues/3
    it('4xx responses should have content-type of text/plain', async () => {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/blargimargarita',
        method: 'GET',
        resolveWithFullResponse: true,
        simple: false // 404 errors fulfill the promise, rather than rejecting
      });

      res.headers['content-type'].should.include('text/plain');
    });

    it('should throw not yet implemented for unfilledout commands', async () => {
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

    it('should throw not implemented for ignored commands', async () => {
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

    it('should get 400 for bad parameters', async () => {
      await request({
        url: 'http://localhost:8181/wd/hub/session/foo/url',
        method: 'POST',
        json: {}
      }).should.eventually.be.rejectedWith("400");
    });

    it('should ignore special extra payload params in the right contexts', async () => {
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

    it('should return the correct error even if driver does not throw', async () => {
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

    describe('multiple sets of arguments', () => {
      describe('optional', () => {
        it('should allow moveto with element', async () => {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/moveto',
            method: 'POST',
            json: {element: '3'}
          });
          res.status.should.equal(0);
          res.value.should.eql(['3', null, null]);
        });
        it('should allow moveto with xoffset/yoffset', async () => {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/moveto',
            method: 'POST',
            json: {xoffset: 42, yoffset: 17}
          });
          res.status.should.equal(0);
          res.value.should.eql([null, 42, 17]);
        });
      });
      describe('required', () => {
        it('should allow removeApp with appId', async () => {
          let res = await request({
            url: 'http://localhost:8181/wd/hub/session/foo/appium/device/remove_app',
            method: 'POST',
            json: {appId: 42}
          });
          res.status.should.equal(0);
          res.value.should.eql(42);
        });
        it('should allow removeApp with bundleId', async () => {
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

    describe('default param wrap', () => {

      it('should wrap', async () => {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/touch/perform',
          method: 'POST',
          json: [{"action":"tap", "options":{"element":"3"}}]
        });
        res.value.should.deep.equal([[{"action":"tap", "options":{"element":"3"}}], 'foo']);
      });

      it('should not wrap twice', async () => {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session/foo/touch/perform',
          method: 'POST',
          json: {actions: [{"action":"tap", "options":{"element":"3"}}]}
        });
        res.value.should.deep.equal([[{"action":"tap", "options":{"element":"3"}}], 'foo']);
      });

    });

    describe('optional sets of arguments', async () => {
      let desiredCapabilities = {a: 'b'};
      let requiredCapabilities = {c: 'd'};
      let capabilities = {e: 'f'};
      it('should allow create session with desired caps', async () => {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session',
          method: 'POST',
          json: {desiredCapabilities}
        });
        res.status.should.equal(0);
        res.value.should.eql(desiredCapabilities);
      });
      it('should allow create session with desired and required caps', async () => {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session',
          method: 'POST',
          json: {
            desiredCapabilities,
            requiredCapabilities
          }
        });
        res.status.should.equal(0);
        res.value.should.eql(_.extend({}, desiredCapabilities, requiredCapabilities));
      });
      it('should fail to create session without capabilities or desiredCapabilities', async () => {
        await request({
          url: 'http://localhost:8181/wd/hub/session',
          method: 'POST',
          json: {},
        }).should.eventually.be.rejectedWith('400');
      });
      it('should allow create session with capabilities', async () => {
        let res = await request({
          url: 'http://localhost:8181/wd/hub/session',
          method: 'POST',
          json: {
            capabilities,
          }
        });
        res.status.should.equal(0);
        res.value.should.eql(capabilities);
      });
    });

    it('should handle commands with no response values', async () => {
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

    it('should allow empty string response values', async () => {
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

    it('should send 500 response and an Unknown object for rejected commands', async () => {
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

    it('should not throw UnknownError when known', async () => {
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

  describe('session Ids', () => {
    let driver = new FakeDriver();
    let mjsonwpServer;

    before(async () => {
      mjsonwpServer = await server(routeConfiguringFunction(driver), 8181);
    });

    after(async () => {
      mjsonwpServer.close();
    });

    afterEach( () => {
      driver.sessionId = null;
    });

    it('returns null SessionId for commands without sessionIds', async () => {
      let res = await request({
        url: 'http://localhost:8181/wd/hub/status',
        method: 'GET',
        json: true,
      });

      should.equal(res.sessionId, null);
    });

    it('responds with the same session ID in the request', async () => {
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

    it('yells if no session exists', async () => {
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

    it('yells if invalid session is sent', async () => {
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

    it('should have session IDs in error responses', async () => {
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

    it('should return a new session ID on create', async () => {

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

  describe('via drivers jsonwp proxy', () => {
    let driver;
    let sessionId = 'foo';
    let mjsonwpServer;

    beforeEach(async () => {
      driver = new FakeDriver();
      driver.sessionId = sessionId;
      driver.proxyActive = () => { return true; };
      driver.canProxy = () => { return true; };

      mjsonwpServer = await server(routeConfiguringFunction(driver), 8181);
    });

    afterEach(async () => {
      mjsonwpServer.close();
    });

    it('should give a nice error if proxying is set but no proxy function exists', async () => {
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

    it('should pass on any errors in proxying', async () => {
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

    it('should able to throw ProxyRequestError in proxying', async () => {
      driver.proxyReqRes = async function () {
        var jsonwp = {status: 35, value: "No such context found.", sessionId: "foo"};
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

    it('should let the proxy handle req/res', async () => {
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

    it('should avoid jsonwp proxying when path matches avoidance list', async () => {
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

    it('should fail if avoid proxy list is malformed in some way', async () => {
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

    it('should avoid proxying non-session commands even if not in the list', async () => {
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

    it('should avoid proxying deleteSession commands', async () => {
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
