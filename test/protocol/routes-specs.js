// transpile:mocha

import { _ } from 'lodash';
import { METHOD_MAP, routeToCommandName } from '../../lib/protocol/routes';
import crypto from 'crypto';
import chai from 'chai';


chai.should();

describe('Protocol', function () {

  // TODO test against an explicit protocol rather than a hash of a previous
  // protocol

  describe('ensure protocol consistency', function () {
    it('should not change protocol between patch versions', async function () {
      let shasum = crypto.createHash('sha1');
      for (let [url, urlMapping] of _.toPairs(METHOD_MAP)) {
        shasum.update(url);
        for (let [method, methodMapping] of _.toPairs(urlMapping)) {
          shasum.update(method);
          if (methodMapping.command) {
            shasum.update(methodMapping.command);
          }
          if (methodMapping.payloadParams) {
            let allParams = _.flatten(methodMapping.payloadParams.required);
            if (methodMapping.payloadParams.optional) {
              allParams = allParams.concat(_.flatten(methodMapping.payloadParams.optional));
            }
            for (let param of allParams) {
              shasum.update(param);
            }
            if (methodMapping.payloadParams.wrap) {
              shasum.update('skip');
              shasum.update(methodMapping.payloadParams.wrap);
            }
          }
        }
      }
      let hash = shasum.digest('hex').substring(0, 8);
      // Modify the hash whenever the protocol has intentionally been modified.
      hash.should.equal('28048f99');
    });
  });

  describe('check route to command name conversion', function () {
    it('should properly lookup correct command name for endpoint with session', function () {
      const cmdName = routeToCommandName('/timeouts', 'POST');
      cmdName.should.equal('timeouts');
    });

    it('should properly lookup correct command name for endpoint with session', function () {
      const cmdName = routeToCommandName('/timeouts/implicit_wait', 'POST');
      cmdName.should.equal('implicitWait');
    });

    it('should properly lookup correct command name for endpoint without session', function () {
      const cmdName = routeToCommandName('/status', 'GET');
      cmdName.should.equal('getStatus');
    });

    it('should properly lookup correct command name for endpoint without leading slash', function () {
      const cmdName = routeToCommandName('status', 'GET');
      cmdName.should.equal('getStatus');
    });

    it('should properly lookup correct command name for fully specified endpoint', function () {
      const cmdName = routeToCommandName('/wd/hub/status', 'GET');
      cmdName.should.equal('getStatus');
    });

    it('should not find command name if incorrect input data has been specified', function () {
      for (let [route, method] of [['/wd/hub/status', 'POST'],
                                   ['/xstatus', 'GET'],
                                   ['status', 'POST']]) {
        const cmdName = routeToCommandName(route, method);
        chai.should().equal(cmdName, undefined);
      }
    });
  });

});
