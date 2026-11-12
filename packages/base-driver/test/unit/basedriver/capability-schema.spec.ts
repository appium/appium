import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import type {CapabilitySchema, Constraints, InitialOpts, W3CCapabilities} from '@appium/types';
import {createSandbox} from 'sinon';

import {BaseDriver} from '../../../lib';
import {validateCaps} from '../../../lib/basedriver/capabilities';
import {getCapabilitySchemaValidator} from '../../../lib/basedriver/capability-schema';
import {log} from '../../../lib/basedriver/logger';

describe('capability schemas', function () {
  const sandbox = createSandbox();
  const drivers: BaseDriver<Constraints>[] = [];
  const schema = {
    type: 'object',
    properties: {
      retries: {type: 'integer', minimum: 0},
      mode: {enum: ['fast', 'safe']},
      connection: {
        type: 'object',
        properties: {timeout: {type: 'number', minimum: 1}},
        required: ['timeout'],
      },
    },
    required: ['mode', 'retries'],
  } as const satisfies CapabilitySchema;

  function makeDriver(capSchema: CapabilitySchema = schema, validate = true) {
    const driver = new BaseDriver<Constraints>({} as InitialOpts, validate);
    driver.desiredCapSchema = capSchema;
    drivers.push(driver);
    return driver;
  }

  afterEach(async function () {
    sandbox.restore();
    await Promise.all(drivers.splice(0).map((driver) => driver.deleteSession()));
  });

  it('selects a later schema-valid candidate without changing the request', async function () {
    const driver = makeDriver();
    const request = {
      alwaysMatch: {platformName: 'fake', 'appium:options': {mode: 'safe'}},
      firstMatch: [
        {'appium:retries': -1, 'appium:connection': {timeout: 0}},
        {'appium:retries': 3, 'appium:connection': {timeout: 10}},
      ],
    } as W3CCapabilities<Constraints>;
    const original = structuredClone(request);
    const [, caps] = await driver.createSession(request);
    assert.equal(caps.retries, 3);
    assert.deepEqual(caps.connection, {timeout: 10});
    assert.equal(caps.mode, 'safe');
    assert.deepEqual(request, original);
  });

  it('reports all failed candidates with field paths and does not create a session', async function () {
    const driver = makeDriver();
    await assert.rejects(
      driver.createSession({
        alwaysMatch: {platformName: 'fake', 'appium:mode': 'fast'},
        firstMatch: [{'appium:retries': -1}, {'appium:retries': '3'}],
      }),
      {name: 'SessionNotCreatedError', message: /\/retries.*>= 0[\s\S]*\/retries.*integer/},
    );
    assert.equal(driver.sessionId, null);
  });

  it('evaluates cross-field requirements after merging alwaysMatch and firstMatch', async function () {
    const driver = makeDriver({
      type: 'object',
      properties: {mode: {type: 'string'}, token: {type: 'string'}},
      if: {properties: {mode: {const: 'secure'}}, required: ['mode']},
      then: {required: ['token']},
    });
    const [, caps] = await driver.createSession({
      alwaysMatch: {platformName: 'fake', 'appium:mode': 'secure'},
      firstMatch: [{}, {'appium:token': 'secret'}],
    });
    assert.equal(caps.token, 'secret');
  });

  it('supports local references and composed schemas', function () {
    const validate = getCapabilitySchemaValidator({
      type: 'object',
      definitions: {positive: {type: 'number', minimum: 1}},
      properties: {count: {$ref: '#/definitions/positive'}},
      allOf: [{required: ['count']}],
      anyOf: [{properties: {count: {const: 1}}}, {properties: {count: {minimum: 10}}}],
    });
    validate({count: 10});
    assert.throws(() => validate({count: 2}), /anyOf/);
  });

  it('does not coerce values, apply defaults, or remove extra properties', function () {
    const validate = getCapabilitySchemaValidator({
      type: 'object',
      properties: {enabled: {type: 'boolean', default: true}},
      additionalProperties: false,
    });
    const missing = {};
    validate(missing);
    assert.deepEqual(missing, {});
    const invalid = {enabled: 'true', extra: 1};
    assert.throws(() => validate(invalid), /additional properties.*boolean/);
    assert.deepEqual(invalid, {enabled: 'true', extra: 1});
  });

  it('supports draft-07 formats and rejects unsupported drafts and unknown keywords', function () {
    const validate = getCapabilitySchemaValidator({
      type: 'object',
      properties: {url: {type: 'string', format: 'uri'}},
    });
    validate({url: 'https://example.com'});
    assert.throws(() => validate({url: 'invalid'}), /\/url.*format/);
    assert.throws(
      () => getCapabilitySchemaValidator({$schema: 'https://json-schema.org/draft/2020-12/schema'}),
      /Invalid capability schema/,
    );
    assert.throws(
      () => getCapabilitySchemaValidator({$async: true, type: 'object'} as CapabilitySchema),
      /Invalid capability schema.*Asynchronous/,
    );
    assert.throws(
      () => getCapabilitySchemaValidator({type: 'object', properties: {url: {typo: true}}} as CapabilitySchema),
      /Invalid capability schema.*typo/,
    );
  });

  it('validates direct calls to validateDesiredCaps as well as session candidates', function () {
    const driver = makeDriver();
    assert.throws(() => driver.validateDesiredCaps({platformName: 'fake', mode: 'fast', retries: -1}), {
      name: 'SessionNotCreatedError',
      message: /\/retries.*>= 0/,
    });
    assert.equal(driver.validateDesiredCaps({platformName: 'fake', mode: 'fast', retries: 1}), true);
  });

  it('keeps legacy conversion for legacy constraints when schemas are also present', async function () {
    const driver = makeDriver({type: 'object', properties: {count: {type: 'number'}, enabled: {type: 'boolean'}}});
    driver.desiredCapConstraints = {count: {isNumber: true}, enabled: {isBoolean: true}};
    const [, caps] = await driver.createSession({
      alwaysMatch: {platformName: 'fake', 'appium:count': '2.5', 'appium:enabled': 'false'},
      firstMatch: [{}],
    });
    assert.equal(caps.count, 2.5);
    assert.equal(caps.enabled, false);
  });

  it('requires both schema and legacy constraints to pass', async function () {
    const driver = makeDriver({type: 'object', properties: {mode: {const: 'safe'}}});
    driver.desiredCapConstraints = {mode: {inclusion: ['fast']}};
    await assert.rejects(
      driver.createSession({alwaysMatch: {platformName: 'fake', 'appium:mode': 'fast'}, firstMatch: [{}]}),
      /\/mode.*constant/,
    );
  });

  it('still rejects conflicting alwaysMatch and firstMatch keys', async function () {
    const driver = makeDriver();
    await assert.rejects(
      driver.createSession({
        alwaysMatch: {platformName: 'fake', 'appium:mode': 'safe', 'appium:retries': 1},
        firstMatch: [{'appium:retries': 2}],
      }),
      /should not exist on both/,
    );
  });

  it('treats schema properties as known capabilities', async function () {
    const driver = makeDriver();
    const warn = sandbox.spy(driver.log, 'warn');
    await driver.createSession({
      alwaysMatch: {platformName: 'fake', 'appium:mode': 'safe', 'appium:retries': 1},
      firstMatch: [{}],
    });
    assert.equal(warn.calledWithMatch('not recognized'), false);
  });

  it('honors shouldValidateCaps=false including an invalid driver schema', async function () {
    const driver = makeDriver(
      {type: 'object', properties: {value: {type: 'invalid'}}} as unknown as CapabilitySchema,
      false,
    );
    await driver.createSession({alwaysMatch: {'appium:value': 1}, firstMatch: [{}]});
    assert.equal(driver.caps.value, 1);
  });

  it('reports invalid schemas as driver errors before creating a session', async function () {
    const driver = makeDriver({type: 'object', properties: {value: {type: 'invalid'}}} as unknown as CapabilitySchema);
    await assert.rejects(driver.createSession({alwaysMatch: {platformName: 'fake'}, firstMatch: [{}]}), {
      name: 'TypeError',
      message: /Invalid capability schema/,
    });
    assert.equal(driver.sessionId, null);
    assert.throws(
      () => getCapabilitySchemaValidator({$ref: 'https://example.invalid/caps.json'}),
      /Invalid capability schema/,
    );
  });

  it('caches immutable schemas while isolating identical IDs and replacement schemas', function () {
    const first = {$id: 'urn:appium:test', type: 'object', properties: {n: {const: 1}}} as const;
    const second = {$id: 'urn:appium:test', type: 'object', properties: {n: {const: 2}}} as const;
    const validateFirst = getCapabilitySchemaValidator(first);
    assert.equal(getCapabilitySchemaValidator(first), validateFirst);
    const validateSecond = getCapabilitySchemaValidator(second);
    validateFirst({n: 1});
    validateSecond({n: 2});
    assert.throws(() => validateSecond({n: 1}), /constant/);
  });

  describe('legacy validation compatibility', function () {
    it('preserves permissive numeric and boolean strings', function () {
      for (const n of ['2.5', '0', '']) {
        assert.doesNotThrow(() => validateCaps<Constraints>({n}, {n: {isNumber: true}}));
      }
      for (const enabled of ['true', 'false', '']) {
        assert.doesNotThrow(() => validateCaps<Constraints>({enabled}, {enabled: {isBoolean: true}}));
      }
      assert.throws(() => validateCaps<Constraints>({enabled: 'TRUE'}, {enabled: {isBoolean: true}}));
    });

    it('preserves required empty-value rules and treats null as absent', function () {
      for (const value of [null, undefined, '', '  ', [], {}, 0, false]) {
        assert.throws(() => validateCaps<Constraints>({value}, {value: {presence: true}}));
      }
      for (const value of ['value', [1], {a: 1}]) {
        assert.doesNotThrow(() => validateCaps<Constraints>({value}, {value: {presence: true}}));
      }
      assert.doesNotThrow(() => validateCaps<Constraints>({value: ''}, {value: {presence: {allowEmpty: true}}}));
      assert.doesNotThrow(() => validateCaps<Constraints>({value: null}, {value: {isString: true}}));
    });

    it('preserves case-insensitive enum checks, negative type rules and warnings', function () {
      assert.doesNotThrow(() =>
        validateCaps<Constraints>({mode: 'SAFE'}, {mode: {inclusionCaseInsensitive: ['safe']}}),
      );
      assert.throws(() => validateCaps<Constraints>({value: 'x'}, {value: {isString: false}}));
      const warn = sandbox.spy(log, 'warn');
      validateCaps<Constraints>({old: true, unknown: 1}, {old: {deprecated: true}});
      assert.equal(warn.calledWithMatch("The 'old' capability has been deprecated"), true);
    });
  });
});
