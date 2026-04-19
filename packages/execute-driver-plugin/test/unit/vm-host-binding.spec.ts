import vm from 'node:vm';
import {expect} from 'chai';
import {wrapHostBindingForVmContext} from '../../lib/vm-host-binding';

describe('wrapHostBindingForVmContext', function () {
  const hostishDriver = Object.create(Object.prototype);
  hostishDriver.sessionId = 'fake';

  it('should still expose ordinary properties on objects to the VM', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    const sessionId = vm.runInNewContext(`d.sessionId`, {d}, {timeout: 500});
    expect(sessionId).to.equal('fake');
  });

  it('should block constructor chaining on objects to the host Function', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    expect(() =>
      vm.runInNewContext(
        `const func = d.constructor.constructor; func('return typeof process')()`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should block Object.getPrototypeOf constructor chaining on objects', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    expect(() =>
      vm.runInNewContext(
        `const p = Object.getPrototypeOf(d);
         const func = p.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should block __proto__ constructor chaining on objects', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    expect(() =>
      vm.runInNewContext(
        `const p = d.__proto__;
         const func = p.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should block constructor chaining on injected timers', function () {
    const st = wrapHostBindingForVmContext(setTimeout);
    const ct = wrapHostBindingForVmContext(clearTimeout);
    expect(() =>
      vm.runInNewContext(
        `const func = setTimeout.constructor.constructor;
         func('return typeof process')()`,
        {setTimeout: st, clearTimeout: ct},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should still allow setTimeout to schedule callbacks', async function () {
    const st = wrapHostBindingForVmContext(setTimeout);
    const ct = wrapHostBindingForVmContext(clearTimeout);
    const waited = vm.runInNewContext(
      `new Promise((resolve) => setTimeout(() => resolve(true), 10))`,
      {setTimeout: st, clearTimeout: ct},
      {timeout: 500}
    ) as Promise<boolean>;
    expect(await waited).to.equal(true);
  });

  it('should block constructor chaining on console method functions', function () {
    const logs: unknown[] = [];
    const consoleFns = {
      log: wrapHostBindingForVmContext((...m: unknown[]) => logs.push(...m)),
    };
    const sandboxConsole = wrapHostBindingForVmContext(consoleFns);
    expect(() =>
      vm.runInNewContext(
        `const func = console.log.constructor.constructor;
         func('return typeof process')()`,
        {console: sandboxConsole},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should block constructor chaining on the console aggregate object', function () {
    const consoleFns = wrapHostBindingForVmContext({
      log: wrapHostBindingForVmContext(() => {}),
    });
    expect(() =>
      vm.runInNewContext(
        `const func = console.constructor.constructor;
         func('return typeof process')()`,
        {console: consoleFns},
        {timeout: 500}
      )
    ).to.throw();
  });
});
