// transpile:mocha

import '../..'; // NOTE: For some reason this file needs to be imported to prevent a babel error
import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import { driverShouldDoJwpProxy } from '../../lib/protocol/protocol';
import {
  MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY, IMAGE_ELEMENT_PREFIX
} from '../../lib/constants';
import BaseDriver from '../../lib/basedriver/driver';

chai.should();
chai.use(chaiAsPromised);

describe('Protocol', function () {

  describe('#driverShouldDoJwpProxy', function () {
    it('should not proxy if an image element is found in request url', function () {
      const d = new BaseDriver();
      sinon.stub(d, 'proxyActive').returns(true);
      sinon.stub(d, 'proxyRouteIsAvoided').returns(false);
      const hasImageElements = [
        `/session/:sessionId/element/${IMAGE_ELEMENT_PREFIX}bar`,
        `/session/:sessionId/element/${IMAGE_ELEMENT_PREFIX}bar/click`,
        `/session/:sessionId/element/${IMAGE_ELEMENT_PREFIX}bar/submit`,
        `/session/:sessionId/screenshot/${IMAGE_ELEMENT_PREFIX}bar`,
      ];
      const noImageElements = [
        `/session/:sessionId/element/${IMAGE_ELEMENT_PREFIX}`,
        `/session/:sessionId/screenshot/${IMAGE_ELEMENT_PREFIX}`,
        `/session/:sessionId/element/bar${IMAGE_ELEMENT_PREFIX}`,
        '/session/:sessionId/element/element123',
        '/session/:sessionId/title',
        `/session/:sessionId/notelement/${IMAGE_ELEMENT_PREFIX}bar`,
      ];
      for (let testCase of hasImageElements) {
        const req = {body: {}, params: {}, originalUrl: testCase};
        driverShouldDoJwpProxy(d, req, null).should.be.false;
      }
      for (let testCase of noImageElements) {
        const req = {body: {}, params: {}, originalUrl: testCase};
        driverShouldDoJwpProxy(d, req, null).should.be.true;
      }
    });
    it('should not proxy if an image element is found in request body', function () {
      const d = new BaseDriver();
      sinon.stub(d, 'proxyActive').returns(true);
      sinon.stub(d, 'proxyRouteIsAvoided').returns(false);
      const hasImageElements = [{
        [W3C_ELEMENT_KEY]: `${IMAGE_ELEMENT_PREFIX}bar`,
      }, {
        [W3C_ELEMENT_KEY]: `${IMAGE_ELEMENT_PREFIX}foo`,
      }, {
        [MJSONWP_ELEMENT_KEY]: `${IMAGE_ELEMENT_PREFIX}bar`,
      }];
      const noImageElements = [{
        [IMAGE_ELEMENT_PREFIX]: 'foo',
      }, {
        [W3C_ELEMENT_KEY]: `${IMAGE_ELEMENT_PREFIX}`,
      }, {
        [MJSONWP_ELEMENT_KEY]: `${IMAGE_ELEMENT_PREFIX}`,
      }, {
        foo: 'bar',
      }, {
        [W3C_ELEMENT_KEY]: 'bar',
      }, {
        [MJSONWP_ELEMENT_KEY]: 'bar',
      }, {
        foo: `${IMAGE_ELEMENT_PREFIX}bar`,
      }, {
        foo: `bar${IMAGE_ELEMENT_PREFIX}`
      }, {
        [W3C_ELEMENT_KEY]: `bar${IMAGE_ELEMENT_PREFIX}`
      }, {
        [MJSONWP_ELEMENT_KEY]: `bar${IMAGE_ELEMENT_PREFIX}`
      }];
      for (let testCase of hasImageElements) {
        const req = {body: testCase, params: {}};
        driverShouldDoJwpProxy(d, req, null).should.be.false;
      }
      for (let testCase of noImageElements) {
        const req = {body: testCase, params: {}};
        driverShouldDoJwpProxy(d, req, null).should.be.true;
      }

    });
  });
});
