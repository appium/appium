import assert from 'node:assert/strict';
import {before, beforeEach, describe, it} from 'node:test';

import {PROTOCOLS} from '../../../lib/constants';
import {COMMAND_URLS_CONFLICTS, ProtocolConverter} from '../../../lib/jsonwp-proxy/protocol-converter';

const {MJSONWP, W3C} = PROTOCOLS;

/**
 * Type used to access private methods in unit tests.
 * Standalone type (not intersecting with ProtocolConverter) to avoid TS reducing the intersection to never.
 */
interface ProtocolConverterTest {
  getTimeoutRequestObjects(body: unknown): Record<string, unknown>[];
  proxySetValue(url: string, method: string, body: unknown): Promise<[unknown, unknown]>;
}

describe('Protocol Converter', function () {
  describe('getTimeoutRequestObjects', function () {
    let converter: ProtocolConverter;
    before(function () {
      converter = new ProtocolConverter((() => {}) as any);
    });
    it('should take W3C inputs and produce MJSONWP compatible objects', function () {
      converter.downstreamProtocol = MJSONWP;
      const timeoutObjects = (converter as unknown as ProtocolConverterTest).getTimeoutRequestObjects({
        script: 100,
      });
      assert.strictEqual(timeoutObjects.length, 1);
      assert.deepStrictEqual(timeoutObjects[0], {type: 'script', ms: 100});
    });
    it('should ignore invalid entries while converting from W3C', function () {
      converter.downstreamProtocol = MJSONWP;
      const timeoutObjects = (converter as unknown as ProtocolConverterTest).getTimeoutRequestObjects({
        script: 100,
        sessionId: '5432a4f3-cd89-4781-8905-ea9d3150840c',
        bar: -1,
        baz: undefined,
      } as any);
      assert.strictEqual(timeoutObjects.length, 1);
      assert.deepStrictEqual(timeoutObjects[0], {type: 'script', ms: 100});
    });
    it('should take multiple W3C timeouts and produce multiple MJSONWP compatible objects', function () {
      converter.downstreamProtocol = MJSONWP;
      const [scriptTimeout, pageLoadTimeout, implicitTimeout] = (
        converter as unknown as ProtocolConverterTest
      ).getTimeoutRequestObjects({
        script: 100,
        pageLoad: 200,
        implicit: 300,
      });
      assert.deepStrictEqual(scriptTimeout, {
        type: 'script',
        ms: 100,
      });
      assert.deepStrictEqual(pageLoadTimeout, {
        type: 'page load',
        ms: 200,
      });
      assert.deepStrictEqual(implicitTimeout, {
        type: 'implicit',
        ms: 300,
      });
    });
    it('should take MJSONWP input and produce W3C compatible object', function () {
      converter.downstreamProtocol = W3C;
      const timeoutObjects = (converter as unknown as ProtocolConverterTest).getTimeoutRequestObjects({
        type: 'implicit',
        ms: 300,
      });
      assert.strictEqual(timeoutObjects.length, 1);
      assert.deepStrictEqual(timeoutObjects[0], {implicit: 300});
    });
    it('should not change the input if protocol name is unknown', function () {
      converter.downstreamProtocol = null as any;
      const timeoutObjects = (converter as unknown as ProtocolConverterTest).getTimeoutRequestObjects({
        type: 'implicit',
        ms: 300,
      });
      assert.strictEqual(timeoutObjects.length, 1);
      assert.deepStrictEqual(timeoutObjects[0], {type: 'implicit', ms: 300});
    });
    it('should not change the input if protocol name is unchanged', function () {
      converter.downstreamProtocol = MJSONWP;
      const timeoutObjects = (converter as unknown as ProtocolConverterTest).getTimeoutRequestObjects({
        type: 'implicit',
        ms: 300,
      });
      assert.strictEqual(timeoutObjects.length, 1);
      assert.deepStrictEqual(timeoutObjects[0], {type: 'implicit', ms: 300});
    });
  });

  describe('setValue', function () {
    let converter: ProtocolConverter;
    let responseBody: any;
    before(function () {
      responseBody = null;
      converter = new ProtocolConverter(((url: string, method: string, body: any) => {
        responseBody = body;
      }) as any);
    });
    beforeEach(function () {
      responseBody = {};
    });

    it('should calculate value if not present', async function () {
      await (converter as unknown as ProtocolConverterTest).proxySetValue('', '', {
        text: 'bla',
      });
      assert.deepStrictEqual(responseBody, {
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
    it('should calculate text if not present', async function () {
      await (converter as unknown as ProtocolConverterTest).proxySetValue('', '', {
        value: ['b', 'l', 'a'],
      });
      assert.deepStrictEqual(responseBody, {
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
    it('should keep the response body unchanged if both value and text are present', async function () {
      await (converter as unknown as ProtocolConverterTest).proxySetValue('', '', {
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
      assert.deepStrictEqual(responseBody, {
        text: 'bla',
        value: ['b', 'l', 'a'],
      });
    });
  });
  describe('getProperty', function () {
    let jsonwpConverter: (url: string) => string;
    let w3cConverter: (url: string) => string;
    before(function () {
      for (const command of COMMAND_URLS_CONFLICTS) {
        if ((command.commandNames as readonly string[]).includes('getProperty')) {
          jsonwpConverter = command.jsonwpConverter;
          w3cConverter = command.w3cConverter;
        }
      }
    });
    it('should convert "property/value" to "attribute/value"', function () {
      assert.strictEqual(
        jsonwpConverter('/session/123/element/456/property/value'),
        '/session/123/element/456/attribute/value',
      );
    });
    it('should convert "property/:somePropName" to "attribute/:somePropName"', function () {
      assert.strictEqual(
        jsonwpConverter('/session/123/element/456/property/somePropName'),
        '/session/123/element/456/attribute/somePropName',
      );
    });
    it('should not convert from JSONWP to W3C', function () {
      assert.strictEqual(
        w3cConverter('/session/123/element/456/attribute/someAttr'),
        '/session/123/element/456/attribute/someAttr',
      );
      assert.strictEqual(
        w3cConverter('/session/123/element/456/property/someProp'),
        '/session/123/element/456/property/someProp',
      );
    });
  });
});
