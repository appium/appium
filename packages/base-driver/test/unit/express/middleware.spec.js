import {pathToRegexp} from 'path-to-regexp';

describe('middleware', function () {
  describe('pathToRegexp', function () {
    it('should match path pattern', function () {
      const pathname = '/ws/session/1234/appium/device/syslog';
      const url = 'ws://127.0.0.1:8000/ws/session/1234/appium/device/syslog';
      const currentPathname = new URL(url).pathname;
      pathToRegexp(pathname).test(currentPathname).should.be.true;
    });
  });
});
