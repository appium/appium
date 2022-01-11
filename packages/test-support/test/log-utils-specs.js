// transpile:mocha

import { stubLog } from '../lib';
import log from '../lib/logger';
import sinon from 'sinon';
import '@dabh/colors';


describe('log-utils', function () {
  describe('stubLog', function () {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
    });
    afterEach(function () {
      sandbox.restore();
    });
    it('should stub log', function () {
      let logStub = stubLog(sandbox, log);
      log.info('Hello World!');
      log.warn(`The ${'sun'.yellow} is shining!`);
      logStub.output.should.equals([
        'info: Hello World!',
        `warn: The ${'sun'.yellow} is shining!`
      ].join('\n'));
    });
    it('should stub log and strip colors', function () {
      let logStub = stubLog(sandbox, log, {stripColors: true});
      log.info('Hello World!');
      log.warn(`The ${'sun'.yellow} is shining!`);
      logStub.output.should.equals([
        'info: Hello World!',
        'warn: The sun is shining!'
      ].join('\n'));
    });
  });
});
