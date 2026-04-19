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

  it('should block constructor chaining on nested methods (e.g. driver.deleteSession)', function () {
    const host = Object.create(Object.prototype);
    host.deleteSession = () => {};
    const d = wrapHostBindingForVmContext(host);
    expect(() =>
      vm.runInNewContext(
        `const m = d.deleteSession;
         const func = m.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should block host Function escape via both d.someMethod and O.getOwnPropertyDescriptor for a function-valued property', function () {
    const host = Object.create(null);
    function someMethod() {
      return 1;
    }
    Object.defineProperty(host, 'someMethod', {
      value: someMethod,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const d = wrapHostBindingForVmContext(host);

    expect(() =>
      vm.runInNewContext(
        `const m = d.someMethod;
         const func = m.constructor.constructor;
         func('return typeof process')();`,
        {d},
        {timeout: 500}
      )
    ).to.throw();

    expect(() =>
      vm.runInNewContext(
        `const desc = Object.getOwnPropertyDescriptor(d, 'someMethod');
         if (!desc || !('value' in desc)) { throw new Error('expected data descriptor'); }
         const v = desc.value;
         const func = v.constructor.constructor;
         func('return typeof process')();`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should block constructor chaining on .bind() results', function () {
    const host = Object.create(Object.prototype);
    host.fn = (x: unknown) => x;
    const d = wrapHostBindingForVmContext(host);
    expect(() =>
      vm.runInNewContext(
        `const b = d.fn.bind(d);
         const func = b.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should wrap descriptor values from getOwnPropertyDescriptor', function () {
    const host = Object.create(null);
    Object.defineProperty(host, 'm', {
      value: () => {},
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const d = wrapHostBindingForVmContext(host);
    expect(() =>
      vm.runInNewContext(
        `const desc = Object.getOwnPropertyDescriptor(d, 'm');
         const func = desc.value.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500}
      )
    ).to.throw();
  });

  it('should preserve identity for repeated reads of the same nested method', function () {
    const host = Object.create(Object.prototype);
    host.m = () => {};
    const d = wrapHostBindingForVmContext(host);
    const same = vm.runInNewContext(`d.m === d.m`, {d}, {timeout: 500});
    expect(same).to.equal(true);
  });

  it('should still await Promise results from wrapped methods', async function () {
    const host = Object.create(Object.prototype);
    host.p = () => Promise.resolve(7);
    const d = wrapHostBindingForVmContext(host);
    const v = vm.runInNewContext(`(async () => await d.p())()`, {d}, {timeout: 500}) as Promise<number>;
    expect(await v).to.equal(7);
  });

  it('should block constructor chaining on values fulfilled from wrapped Promises', async function () {
    const host = Object.create(Object.prototype);
    host.p = () => Promise.resolve({x: 1});
    const d = wrapHostBindingForVmContext(host);
    await expect(
      vm.runInNewContext(
        `(async () => {
          const v = await d.p();
          const func = v.constructor.constructor;
          func('return typeof process')();
        })()`,
        {d},
        {timeout: 500}
      )
    ).to.eventually.be.rejected;
  });
});
