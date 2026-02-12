import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type {HTTPMethod} from '@appium/types';
import _ from 'lodash';
import {METHOD_MAP, routeToCommandName} from '../../../lib/protocol';
import crypto from 'node:crypto';

chai.use(chaiAsPromised);

describe('Routes', function () {
  describe('ensure protocol consistency', function () {
    // TODO test against an explicit protocol rather than a hash of a previous
    // protocol
    it('should not change protocol between patch versions', function () {
      const shasum = crypto.createHash('sha1');
      for (const [url, urlMapping] of _.toPairs(METHOD_MAP)) {
        shasum.update(url);
        for (const [method, methodMapping] of _.toPairs(urlMapping as Record<string, {command?: string; payloadParams?: {required?: any[]; optional?: any[]; wrap?: string}}>)) {
          shasum.update(method);
          if (methodMapping.command) {
            shasum.update(methodMapping.command);
          }
          if (methodMapping.payloadParams) {
            let allParams = _.flatten(methodMapping.payloadParams.required ?? []);
            if (methodMapping.payloadParams.optional) {
              allParams = allParams.concat(
                _.flatten(methodMapping.payloadParams.optional)
              );
            }
            for (const param of allParams) {
              shasum.update(String(param));
            }
            if (methodMapping.payloadParams.wrap) {
              shasum.update('skip');
              shasum.update(methodMapping.payloadParams.wrap);
            }
          }
        }
      }
      const hash = shasum.digest('hex').substring(0, 8);
      expect(hash).to.equal('510cbe79');
    });
  });

  describe('check route to command name conversion', function () {
    it('should properly lookup correct command name for endpoint with session', function () {
      const cmdName = routeToCommandName('/timeouts', 'POST');
      expect(cmdName).to.equal('timeouts');
    });

    it('should properly lookup correct command name for endpoint without session', function () {
      const cmdName = routeToCommandName('/status', 'GET');
      expect(cmdName).to.equal('getStatus');
    });

    it('should properly lookup correct command name for endpoint with query params', function () {
      const cmdName = routeToCommandName('/status?foo=1&bar=2', 'GET');
      expect(cmdName).to.equal('getStatus');
    });

    it('should properly lookup correct command name with custom base path', function () {
      const cmdName = routeToCommandName('/wd/hub/status?foo=1&bar=2', 'GET', '/wd/hub');
      expect(cmdName).to.equal('getStatus');
    });

    it('should properly lookup correct command name for endpoint without leading slash', function () {
      const cmdName = routeToCommandName('status', 'GET');
      expect(cmdName).to.equal('getStatus');
    });

    it('should properly lookup correct command name for fully specified endpoint', function () {
      const cmdName = routeToCommandName('/status', 'GET');
      expect(cmdName).to.equal('getStatus');
    });

    it('should not find command name if incorrect input data has been specified', function () {
      for (const [route, method] of [
        ['/status', 'POST'],
        ['/xstatus', 'GET'],
        ['status', 'POST'],
      ] as [string, string][]) {
        const cmdName = routeToCommandName(route, method as HTTPMethod);
        expect(cmdName).to.equal(undefined);
      }
    });
  });
});
