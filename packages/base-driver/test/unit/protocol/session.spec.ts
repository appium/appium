import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';
import type {Request} from 'express';

import {BaseDriver} from '../../../lib/basedriver/driver.js';
import {getSessionId} from '../../../lib/protocol/session.js';

describe('Session', function () {
  describe('getSessionId', function () {
    const sessionId = '7b918a26-0649-11f1-b909-e2a798b4b114';
    const fakeDriver = new BaseDriver({} as InitialOpts);

    it('should pick up the first value as the session id', function () {
      const req = {params: {sessionId: [sessionId]}} as unknown as Request;
      assert.strictEqual(getSessionId(fakeDriver as any, req), sessionId);
    });

    it('should get session id', function () {
      const req = {params: {sessionId}} as unknown as Request;
      assert.strictEqual(getSessionId(fakeDriver as any, req), sessionId);
    });

    it('should be undefined', function () {
      const req = {params: {sessionId: undefined}} as unknown as Request;
      assert.strictEqual(getSessionId(fakeDriver as any, req), undefined);
    });
  });
});
