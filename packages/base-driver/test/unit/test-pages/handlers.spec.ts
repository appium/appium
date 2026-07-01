import {afterEach, beforeEach, describe, it} from 'node:test';

import {expect} from 'chai';
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

    expect(res.send.calledOnce).to.be.true;
    expect(res.send.args[0][0]).to.include("Let's browse!");
  });
});
