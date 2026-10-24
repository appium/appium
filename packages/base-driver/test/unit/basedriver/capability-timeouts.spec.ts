import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {Constraints, W3CCapabilities} from '@appium/types';

import {parseCaps, processCapabilities} from '../../../lib/basedriver/capabilities.js';
import {BaseDriver, errors, getResponseForW3CError} from '../../../lib/index.js';

type TestCaps = W3CCapabilities<Constraints>;

describe('New Session timeout candidate validation', function () {
  const invalidTimeouts = [
    false,
    100,
    '100',
    [],
    {script: '100'},
    {pageLoad: true},
    {implicit: -1},
    {implicit: Number.MAX_SAFE_INTEGER + 1},
    {script: {}},
  ];

  for (const timeouts of invalidTimeouts) {
    for (const location of ['alwaysMatch', 'first', 'last'] as const) {
      it(`rejects ${JSON.stringify(timeouts)} in ${location} before matching`, function () {
        const caps =
          location === 'alwaysMatch'
            ? {alwaysMatch: {timeouts}, firstMatch: [{}]}
            : {firstMatch: location === 'first' ? [{timeouts}, {}] : [{}, {timeouts}]};
        assert.throws(() => processCapabilities(caps as unknown as TestCaps), errors.InvalidArgumentError);
      });
    }
  }

  for (const timeouts of [{implicit: -1}, [], {script: '100'}]) {
    it(`rejects an unsupported platform's ${JSON.stringify(timeouts)} before choosing a supported candidate`, function () {
      assert.throws(
        () =>
          processCapabilities(
            {
              firstMatch: [{platformName: 'Android'}, {platformName: 'iOS', timeouts}],
            } as unknown as TestCaps,
            {platformName: {isString: true, inclusionCaseInsensitive: ['Android']}},
          ),
        errors.InvalidArgumentError,
      );
    });
  }

  it('validates a later candidate before reporting an earlier duplicate', function () {
    assert.throws(
      () =>
        processCapabilities({
          alwaysMatch: {platformName: 'Android'},
          firstMatch: [{platformName: 'Android'}, {timeouts: {implicit: -1}}],
        }),
      /Invalid implicit timeout/,
    );
  });

  it('preserves valid partial, null and unknown timeout fields without mutating the request', function () {
    const caps = {
      firstMatch: [
        {timeouts: {script: null, implicit: 0, pageLoad: Number.MAX_SAFE_INTEGER, custom: 'unchanged'}},
        {timeouts: {}},
        {timeouts: null},
      ],
    } as unknown as TestCaps;
    const original = structuredClone(caps);
    const result = parseCaps(caps);
    assert.deepStrictEqual(result.matchedCaps, caps.firstMatch![0]);
    assert.equal(result.validatedFirstMatchCaps.length, 3);
    assert.deepStrictEqual(caps, original);
  });

  it('retains the explicit capability-validation opt-out', function () {
    assert.deepStrictEqual(
      processCapabilities({firstMatch: [{}, {timeouts: []}]} as unknown as TestCaps, {}, false),
      {},
    );
  });

  it("keeps other vendors' timeout extension values opaque", function () {
    assert.deepStrictEqual(processCapabilities({alwaysMatch: {'vendor:timeouts': {script: 'custom'}}} as TestCaps), {
      'vendor:timeouts': {script: 'custom'},
    });
  });

  for (const timeouts of invalidTimeouts) {
    it(`returns invalid argument without creating state for an unused ${JSON.stringify(timeouts)}`, async function () {
      const driver = new BaseDriver();
      const before = {
        script: driver.scriptTimeoutMs,
        pageLoad: driver.pageLoadTimeoutMs,
        implicit: driver.implicitWaitMs,
      };
      try {
        await assert.rejects(
          driver.createSession({firstMatch: [{platformName: 'Fake'}, {timeouts}]} as unknown as TestCaps),
          (error) => {
            const [status, body] = getResponseForW3CError(error);
            assert.equal(status, 400);
            assert.equal(body.value.error, 'invalid argument');
            return true;
          },
        );
        assert.equal(driver.sessionId, null);
        assert.deepStrictEqual(
          {script: driver.scriptTimeoutMs, pageLoad: driver.pageLoadTimeoutMs, implicit: driver.implicitWaitMs},
          before,
        );
      } finally {
        await driver.deleteSession();
      }
    });
  }
});
