import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it} from 'node:test';

import type {Request, Response} from 'express';
import {createSandbox} from 'sinon';

import {welcome} from '../../../lib/test-pages/handlers';

describe('welcome', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fill the template', async function () {
    const res = {
      send: sandbox.stub(),
    };
    await welcome({} as Request, res as unknown as Response);

    assert.strictEqual(res.send.calledOnce, true);
    assert.ok(res.send.args[0][0].includes("Let's browse!"));
  });
});
