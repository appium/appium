import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {InitialOpts} from '@appium/types';
import type {Request, Response} from 'express';

import {BaseDriver} from '../../../lib/basedriver/driver';
import {checkParams, getSessionId, isClientDisconnected, routeConfiguringFunction} from '../../../lib/protocol/protocol';

describe('Protocol', function () {
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

  describe('isClientDisconnected', function () {
    it('should return false for completed normal POST requests (req.destroyed=true, req.complete=true)', function () {
      const req = {destroyed: true, complete: true} as unknown as Request;
      const res = {destroyed: false, writableEnded: false, socket: {destroyed: false}} as unknown as Response;
      assert.strictEqual(isClientDisconnected(req, res), false);
    });

    it('should return true when res.destroyed is true', function () {
      const req = {destroyed: false, complete: false} as unknown as Request;
      const res = {destroyed: true, writableEnded: false} as unknown as Response;
      assert.strictEqual(isClientDisconnected(req, res), true);
    });

    it('should return true when socket is destroyed', function () {
      const req = {destroyed: false, complete: false} as unknown as Request;
      const res = {destroyed: false, writableEnded: false, socket: {destroyed: true}} as unknown as Response;
      assert.strictEqual(isClientDisconnected(req, res), true);
    });

    it('should return true when request is destroyed mid-stream (req.complete=false)', function () {
      const req = {destroyed: true, complete: false} as unknown as Request;
      const res = {destroyed: false, writableEnded: false, socket: {destroyed: false}} as unknown as Response;
      assert.strictEqual(isClientDisconnected(req, res), true);
    });

    it('should return false when response has already ended', function () {
      const req = {destroyed: true, complete: false} as unknown as Request;
      const res = {destroyed: true, writableEnded: true, socket: {destroyed: true}} as unknown as Response;
      assert.strictEqual(isClientDisconnected(req, res), false);
    });
  });

  describe('aborted request & orphan session cleanup', function () {
    it('should execute command normally on POST request after body read completes', async function () {
      let executed = false;
      const fakeDriver = {
        sessionExists: () => true,
        proxyActive: () => false,
        executeCommand: async (cmd: string) => {
          if (cmd === 'getStatus') {
            executed = true;
            return {build: {version: '1.0.0'}};
          }
          return null;
        },
      } as any;

      const routes: Record<string, Function> = {};
      const app = {
        get: (path: string, handler: Function) => { routes[`GET:${path}`] = handler; },
        post: (path: string, handler: Function) => { routes[`POST:${path}`] = handler; },
        delete: (path: string, handler: Function) => { routes[`DELETE:${path}`] = handler; },
      } as any;

      const addRoutes = routeConfiguringFunction(fakeDriver);
      addRoutes(app);

      const req = {
        body: {},
        params: {},
        destroyed: true,
        complete: true,
        headers: {},
      } as unknown as Request;

      let responseSent = false;
      const res = {
        destroyed: false,
        writableEnded: false,
        socket: {destroyed: false},
        status: function (code: number) {
          return this;
        },
        json: function (val: any) {
          responseSent = true;
          return this;
        },
      } as unknown as Response;

      const statusHandler = routes['GET:/status'];
      assert.ok(statusHandler);
      await statusHandler(req, res);
      assert.strictEqual(executed, true);
      assert.strictEqual(responseSent, true);
    });

    it('should delete orphaned session when client disconnects during createSession', async function () {
      const createdSessionId = 'session-orphan-999';
      const deletedSessions: string[] = [];

      const fakeDriver = {
        sessionExists: () => false,
        proxyActive: () => false,
        executeCommand: async (cmd: string, ...args: any[]) => {
          if (cmd === 'createSession') {
            return [createdSessionId, {platformName: 'iOS'}];
          }
          if (cmd === 'deleteSession') {
            deletedSessions.push(args[0]);
            return null;
          }
          return null;
        },
      } as any;

      const routes: Record<string, Function> = {};
      const app = {
        get: (path: string, handler: Function) => { routes[`GET:${path}`] = handler; },
        post: (path: string, handler: Function) => { routes[`POST:${path}`] = handler; },
        delete: (path: string, handler: Function) => { routes[`DELETE:${path}`] = handler; },
      } as any;

      const addRoutes = routeConfiguringFunction(fakeDriver);
      addRoutes(app);

      const req = {
        body: {capabilities: {alwaysMatch: {platformName: 'iOS'}}},
        params: {},
        destroyed: true,
        complete: false,
        headers: {},
      } as unknown as Request;

      const res = {
        destroyed: true,
        writableEnded: false,
        socket: {destroyed: true},
        status: function () { return this; },
        json: function () { return this; },
      } as unknown as Response;

      const createSessionHandler = routes['POST:/session'];
      assert.ok(createSessionHandler);
      await createSessionHandler(req, res);

      assert.deepStrictEqual(deletedSessions, [createdSessionId]);
    });
  });

  describe('checkParams', function () {
    it('should pass if no params are needed, but some are given', function () {
      const args = checkParams(
        {},
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        },
      );
      assert.deepStrictEqual(args, {});
    });

    it('should preserve session id', function () {
      const args = checkParams(
        {
          optional: ['bar', 'baz'],
        },
        {
          sessionId: 'sessionId',
          id: 'id',
          bar: 'bar',
        },
      );
      assert.deepStrictEqual(args, {
        sessionId: 'sessionId',
        id: 'id',
        bar: 'bar',
      });
    });

    it('should pass if no required params are needed', function () {
      const args = checkParams(
        {
          optional: ['bar', 'baz'],
        },
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        },
      );
      assert.deepStrictEqual(args, {
        bar: 'bar',
        baz: 'baz',
      });
    });

    it('should drop unknown params', function () {
      const args = checkParams(
        {
          required: ['foo'],
          optional: ['bar'],
        },
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        },
      );
      assert.deepStrictEqual(args, {
        foo: 'foo',
        bar: 'bar',
      });
    });

    it('should fail if required params are missing', function () {
      assert.throws(() => {
        checkParams(
          {
            required: ['foo'],
            optional: ['bar'],
          },
          {
            bar: 'bar',
            baz: 'baz',
          },
        );
      });
    });

    it('should pass if a set of required params is matched', function () {
      const args = checkParams(
        {
          required: [['foo'], ['bar']],
          optional: ['baz'],
        },
        {
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
        },
      );
      assert.deepStrictEqual(args, {
        foo: 'foo',
        baz: 'baz',
      });
    });
  });
});
