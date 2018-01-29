// transpile:mocha

import { validators } from '../../lib/protocol/validators';
import chai from 'chai';
import BaseDriver from "../../lib/basedriver/driver";


chai.should();

describe('Protocol', function () {
  describe('direct to driver', function () {

    describe('setUrl', function () {
      it('should fail when no url passed', async function () {
        (() => {validators.setUrl();}).should.throw(/url/i);
      });
      it('should fail when given invalid url', async function () {
        (() => {validators.setUrl('foo');}).should.throw(/url/i);
      });
      it('should succeed when given url starting with http', async function () {
        (() => {validators.setUrl('http://appium.io');}).should.not.throw();
      });
      it('should succeed when given an android-like scheme', async function () {
        (() => {validators.setUrl('content://contacts/people/1');}).should.not.throw();
      });
      it('should succeed with hyphens dots and plus chars in the scheme', async function () {
        (() => {validators.setUrl('my-app.a+b://login');}).should.not.throw();
      });
      it('should succeed when given an about scheme', async function () {
        (() => {validators.setUrl('about:blank');}).should.not.throw();
      });
      it('should succeed when given a data scheme', async function () {
        (() => {validators.setUrl('data:text/html,<html></html>');}).should.not.throw();
      });
    });
    describe('implicitWait', function () {
      it('should fail when given no ms', async function () {
        (() => {validators.implicitWait();}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', async function () {
        (() => {validators.implicitWait("five");}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', async function () {
        (() => {validators.implicitWait(-1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', async function () {
        (() => {validators.implicitWait(0);}).should.not.throw();
      });
      it('should succeed when given an ms greater than 0', async function () {
        (() => {validators.implicitWait(100);}).should.not.throw();
      });
    });
    describe('asyncScriptTimeout', function () {
      it('should fail when given no ms', async function () {
        (() => {validators.asyncScriptTimeout();}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', async function () {
        (() => {validators.asyncScriptTimeout("five");}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', async function () {
        (() => {validators.asyncScriptTimeout(-1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', async function () {
        (() => {validators.asyncScriptTimeout(0);}).should.not.throw();
      });
      it('should succeed when given an ms greater than 0', async function () {
        (() => {validators.asyncScriptTimeout(100);}).should.not.throw();
      });
    });
    describe('timeouts', function () {
      it('should fail when given no ms', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'page load', ms: undefined});}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'page load', ms: 'five'});}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'page load', ms: -1});}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'page load', ms: 0});}).should.not.throw();
      });
      it('should succeed when given an ms greater than 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'page load', ms: 100});}).should.not.throw();
      });
      it('should not allow an invalid timeout type', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.MJSONWP, type: 'foofoo', ms: 100});}).should.throw(/'foofoo'/);
      });
      it('should fail when given a non-numeric scriptDuration', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: 'one', pageLoad: undefined, implicit: undefined});}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric pageLoadDuration', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: 'one', implicit: undefined});}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric implicitDuration', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: undefined, implicit: 'one'});}).should.throw(/ms/i);
      });
      it('should fail when given a negative scriptDuration', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: -1, pageLoad: undefined, implicit: undefined});}).should.throw(/ms/i);
      });
      it('should fail when given a negative pageLoadDuration', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: -1, implicit: undefined});}).should.throw(/ms/i);
      });
      it('should fail when given a negative implicitDuration', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: undefined, implicit: -1});}).should.throw(/ms/i);
      });
      it('should succeed when given scriptDuration of 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: 0, pageLoad: undefined, implicit: undefined});}).should.not.throw(/ms/i);
      });
      it('should succeed when given pageLoadDuration of 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: 0, implicit: undefined});}).should.not.throw(/ms/i);
      });
      it('should succeed when given implicitDuration of 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: undefined, implicit: 0});}).should.not.throw(/ms/i);
      });
      it('should succeed when given scriptDuration greater than 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: 1, pageLoad: undefined, implicit: undefined});}).should.not.throw(/ms/i);
      });
      it('should succeed when given pageLoadDuration greater than 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: 1, implicit: undefined});}).should.not.throw(/ms/i);
      });
      it('should succeed when given implicitDuration greater than 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: undefined, pageLoad: undefined, implicit: 1});}).should.not.throw(/ms/i);
      });
      it('should succeed when given scriptDuration, pageLoadDuration and implicitDuration greater than 0', async function () {
        (() => {validators.timeouts({protocol: BaseDriver.DRIVER_PROTOCOL.W3C, script: 1, pageLoad: 1, implicit: 1});}).should.not.throw(/ms/i);
      });
    });
    describe('clickCurrent', function () {
      it('should fail when given an invalid button', async function () {
        (() => {validators.clickCurrent(4);}).should.throw(/0, 1, or 2/i);
      });
      it('should succeed when given a valid button', async function () {
        (() => {validators.clickCurrent(0);}).should.not.throw();
        (() => {validators.clickCurrent(1);}).should.not.throw();
        (() => {validators.clickCurrent(2);}).should.not.throw();
      });
    });
    describe('setNetworkConnection', function () {
      it('should fail when given no type', async function () {
        (() => {validators.setNetworkConnection();}).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should fail when given an invalid type', async function () {
        (() => {validators.setNetworkConnection(8);}).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should succeed when given a valid type', async function () {
        (() => {validators.setNetworkConnection(0);}).should.not.throw();
        (() => {validators.setNetworkConnection(1);}).should.not.throw();
        (() => {validators.setNetworkConnection(2);}).should.not.throw();
        (() => {validators.setNetworkConnection(4);}).should.not.throw();
        (() => {validators.setNetworkConnection(6);}).should.not.throw();
      });
    });
  });
});
