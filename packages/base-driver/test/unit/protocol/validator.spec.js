// transpile:mocha

import {validators} from '../../../lib/protocol/validators';

describe('Protocol', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  describe('direct to driver', function () {
    describe('setUrl', function () {
      it('should fail when no url passed', function () {
        (() => {
          validators.setUrl();
        }).should.throw(/url/i);
      });
      it('should fail when given invalid url', function () {
        (() => {
          validators.setUrl('foo');
        }).should.throw(/url/i);
      });
      it('should succeed when given url starting with http', function () {
        (() => {
          validators.setUrl('http://appium.io');
        }).should.not.throw();
      });
      it('should succeed when given an android-like scheme', function () {
        (() => {
          validators.setUrl('content://contacts/people/1');
        }).should.not.throw();
      });
      it('should succeed with hyphens dots and plus chars in the scheme', function () {
        (() => {
          validators.setUrl('my-app.a+b://login');
        }).should.not.throw();
      });
      it('should succeed when given an about scheme', function () {
        (() => {
          validators.setUrl('about:blank');
        }).should.not.throw();
      });
      it('should succeed when given a data scheme', function () {
        (() => {
          validators.setUrl('data:text/html,<html></html>');
        }).should.not.throw();
      });
    });
    describe('setNetworkConnection', function () {
      it('should fail when given no type', function () {
        (() => {
          validators.setNetworkConnection();
        }).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should fail when given an invalid type', function () {
        (() => {
          validators.setNetworkConnection(8);
        }).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should succeed when given a valid type', function () {
        (() => {
          validators.setNetworkConnection(0);
        }).should.not.throw();
        (() => {
          validators.setNetworkConnection(1);
        }).should.not.throw();
        (() => {
          validators.setNetworkConnection(2);
        }).should.not.throw();
        (() => {
          validators.setNetworkConnection(4);
        }).should.not.throw();
        (() => {
          validators.setNetworkConnection(6);
        }).should.not.throw();
      });
    });
  });
});
