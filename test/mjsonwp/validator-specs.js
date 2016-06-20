// transpile:mocha

import { validators } from '../../lib/mjsonwp/validators';
import chai from 'chai';


chai.should();

describe('MJSONWP', () => {
  describe('direct to driver', () => {

    describe('setUrl', () => {
      it('should fail when no url passed', async () => {
        (() => {validators.setUrl();}).should.throw(/url/i);
      });
      it('should fail when given invalid url', async () => {
        (() => {validators.setUrl('foo');}).should.throw(/url/i);
      });
      it('should succeed when given url starting with http', async () => {
        (() => {validators.setUrl('http://appium.io');}).should.not.throw;
      });
      it('should succeed when given an android-like scheme', async () => {
        (() => {validators.setUrl('content://contacts/people/1');}).should.not.throw;
      });
      it('should succeed when given an about scheme', async () => {
        (() => {validators.setUrl('about:blank');}).should.not.throw;
      });
      it('should succeed when given a data scheme', async () => {
        (() => {validators.setUrl('data:text/html,<html></html>');}).should.not.throw;
      });
    });
    describe('implicitWait', () => {
      it('should fail when given no ms', async () => {
        (() => {validators.implicitWait();}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', async () => {
        (() => {validators.implicitWait("five");}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', async () => {
        (() => {validators.implicitWait(-1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', async () => {
        (() => {validators.implicitWait(0);}).should.not.throw;
      });
      it('should succeed when given an ms greater than 0', async () => {
        (() => {validators.implicitWait(100);}).should.not.throw;
      });
    });
    describe('asyncScriptTimeout', () => {
      it('should fail when given no ms', async () => {
        (() => {validators.asyncScriptTimeout();}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', async () => {
        (() => {validators.asyncScriptTimeout("five");}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', async () => {
        (() => {validators.asyncScriptTimeout(-1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', async () => {
        (() => {validators.asyncScriptTimeout(0);}).should.not.throw;
      });
      it('should succeed when given an ms greater than 0', async () => {
        (() => {validators.asyncScriptTimeout(100);}).should.not.throw;
      });
    });
    describe('other timeouts', () => {
      it('should fail when given no ms', async () => {
        (() => {validators.timeouts('page load');}).should.throw(/ms/i);
      });
      it('should fail when given a non-numeric ms', async () => {
        (() => {validators.timeouts('page load', "five");}).should.throw(/ms/i);
      });
      it('should fail when given a negative ms', async () => {
        (() => {validators.timeouts('page load', -1);}).should.throw(/ms/i);
      });
      it('should succeed when given an ms of 0', async () => {
        (() => {validators.timeouts('page load', 0);}).should.not.throw;
      });
      it('should succeed when given an ms greater than 0', async () => {
        (() => {validators.timeouts('page load', 100);}).should.not.throw;
      });
      it('should not allow an invalid timeout type', async () => {
        (() => {validators.timeouts('foofoo', 100);}).should.throw(/'foofoo'/);
      });
    });
    describe('clickCurrent', () => {
      it('should fail when given an invalid button', async () => {
        (() => {validators.clickCurrent(4);}).should.throw(/0, 1, or 2/i);
      });
      it('should succeed when given a valid button', async () => {
        (() => {validators.clickCurrent(0);}).should.not.throw;
        (() => {validators.clickCurrent(1);}).should.not.throw;
        (() => {validators.clickCurrent(2);}).should.not.throw;
      });
    });
    describe('setNetworkConnection', () => {
      it('should fail when given no type', async () => {
        (() => {validators.setNetworkConnection();}).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should fail when given an invalid type', async () => {
        (() => {validators.setNetworkConnection(8);}).should.throw(/0, 1, 2, 4, 6/i);
      });
      it('should succeed when given a valid type', async () => {
        (() => {validators.setNetworkConnection(0);}).should.not.throw;
        (() => {validators.setNetworkConnection(1);}).should.not.throw;
        (() => {validators.setNetworkConnection(2);}).should.not.throw;
        (() => {validators.setNetworkConnection(4);}).should.not.throw;
        (() => {validators.setNetworkConnection(6);}).should.not.throw;
      });
    });
  });
});
