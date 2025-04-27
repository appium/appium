import {match} from 'path-to-regexp';

describe('middleware', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  describe('match', function () {
    it('should match static path pattern', function () {
      const pathname = '/ws/session/1234/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      match(pathname)(currentPathname).should.not.be.false;
    });

    it('should match dynamic path pattern', function () {
      const pathname = '/ws/session/:sessionId/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      match(pathname)(currentPathname).should.not.be.false;
    });
  });
});
