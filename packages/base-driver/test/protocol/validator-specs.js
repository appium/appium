// transpile:mocha

import { validators } from '../../lib/protocol/validators.js';
import chai from 'chai';


chai.should();

describe('Protocol', function () {
  describe('direct to driver', function () {

    describe('setUrl', function () {
      it('should fail when no url passed', function () {
        (() => {validators.setUrl();}).should.throw(/url/i);
      });
      it('should fail when given invalid url', function () {
        (() => {validators.setUrl('foo');}).should.throw(/url/i);
      });
      it('should succeed when given url starting with http', function () {
        (() => {validators.setUrl('http://appium.io');}).should.not.throw();
      });
      it('should succeed when given an android-like scheme', function () {
        (() => {validators.setUrl('content://contacts/people/1');}).should.not.throw();
      });
      it('should succeed with hyphens dots and plus chars in the scheme', function () {
        (() => {validators.setUrl('my-app.a+b://login');}).should.not.throw();
      });
      it('should succeed when given an about scheme', function () {
        (() => {validators.setUrl('about:blank');}).should.not.throw();
      });
      it('should succeed when given a data scheme', function () {
        (() => {validators.setUrl('data:text/html,<html></html>');}).should.not.throw();
      });
    });
    describe('implicitWait', function () {
      it('should fail when given no ms', function () {
        (() => {validators.implicitWait();}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', function () {
        (() => {validators.implicitWait('five');}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', function () {
        (() => {validators.implicitWait(-1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', function () {
        (() => {validators.implicitWait(0);}).should.not.throw();
      });
      it('should succeed when given an ms greater than 0', function () {
        (() => {validators.implicitWait(100);}).should.not.throw();
      });
    });
    describe('asyncScriptTimeout', function () {
      it('should fail when given no ms', function () {
        (() => {validators.asyncScriptTimeout();}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', function () {
        (() => {validators.asyncScriptTimeout('five');}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', function () {
        (() => {validators.asyncScriptTimeout(-1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', function () {
        (() => {validators.asyncScriptTimeout(0);}).should.not.throw();
      });
      it('should succeed when given an ms greater than 0', function () {
        (() => {validators.asyncScriptTimeout(100);}).should.not.throw();
      });
    });
    describe('clickCurrent', function () {
      it('should fail when given an invalid button', function () {
        (() => {validators.clickCurrent(4);}).should.throw(/0, 1, or 2/i);
      });
      it('should succeed when given a valid button', function () {
        (() => {validators.clickCurrent(0);}).should.not.throw();
        (() => {validators.clickCurrent(1);}).should.not.throw();
        (() => {validators.clickCurrent(2);}).should.not.throw();
      });
    });
    describe('setNetworkConnection', function () {
      it('should fail when given no type', function () {
        (() => {validators.setNetworkConnection();}).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should fail when given an invalid type', function () {
        (() => {validators.setNetworkConnection(8);}).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should succeed when given a valid type', function () {
        (() => {validators.setNetworkConnection(0);}).should.not.throw();
        (() => {validators.setNetworkConnection(1);}).should.not.throw();
        (() => {validators.setNetworkConnection(2);}).should.not.throw();
        (() => {validators.setNetworkConnection(4);}).should.not.throw();
        (() => {validators.setNetworkConnection(6);}).should.not.throw();
      });
    });
  });
});
