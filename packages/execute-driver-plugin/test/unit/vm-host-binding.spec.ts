import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {types} from 'node:util';
import vm from 'node:vm';

import {wrapHostBindingForVmContext} from '../../lib/vm-host-binding.js';

describe('wrapHostBindingForVmContext', function () {
  const hostishDriver = Object.create(Object.prototype);
  hostishDriver.sessionId = 'fake';

  it('should still expose ordinary properties on objects to the VM', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    const sessionId = vm.runInNewContext(`d.sessionId`, {d}, {timeout: 500});
    assert.strictEqual(sessionId, 'fake');
  });

  it('should block constructor chaining on objects to the host Function', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    assert.throws(() =>
      vm.runInNewContext(
        `const func = d.constructor.constructor; func('return typeof process')()`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should block Object.getPrototypeOf constructor chaining on objects', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    assert.throws(() =>
      vm.runInNewContext(
        `const p = Object.getPrototypeOf(d);
         const func = p.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should block __proto__ constructor chaining on objects', function () {
    const d = wrapHostBindingForVmContext(hostishDriver);
    assert.throws(() =>
      vm.runInNewContext(
        `const p = d.__proto__;
         const func = p.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should block constructor chaining on injected timers', function () {
    const st = wrapHostBindingForVmContext(setTimeout);
    const ct = wrapHostBindingForVmContext(clearTimeout);
    assert.throws(() =>
      vm.runInNewContext(
        `const func = setTimeout.constructor.constructor;
         func('return typeof process')()`,
        {setTimeout: st, clearTimeout: ct},
        {timeout: 500},
      ),
    );
  });

  it('should still allow setTimeout to schedule callbacks and wrap timer this receiver', async function () {
    const st = wrapHostBindingForVmContext(setTimeout);
    const ct = wrapHostBindingForVmContext(clearTimeout);
    const waited = vm.runInNewContext(
      `new Promise((resolve) => setTimeout(function () {
         const escaped = typeof this?.constructor?.constructor === 'function'
           ? this.constructor.constructor('return typeof process')()
           : 'blocked';
         resolve(escaped);
       }, 10))`,
      {setTimeout: st, clearTimeout: ct},
      {timeout: 500},
    ) as Promise<string>;
    assert.strictEqual(await waited, 'blocked');
  });

  it('should block constructor chaining on console method functions', function () {
    const logs: unknown[] = [];
    const consoleFns = {
      log: wrapHostBindingForVmContext((...m: unknown[]) => logs.push(...m)),
    };
    const sandboxConsole = wrapHostBindingForVmContext(consoleFns);
    assert.throws(() =>
      vm.runInNewContext(
        `const func = console.log.constructor.constructor;
         func('return typeof process')()`,
        {console: sandboxConsole},
        {timeout: 500},
      ),
    );
  });

  it('should block constructor chaining on the console aggregate object', function () {
    const consoleFns = wrapHostBindingForVmContext({
      log: wrapHostBindingForVmContext(() => {}),
    });
    assert.throws(() =>
      vm.runInNewContext(
        `const func = console.constructor.constructor;
         func('return typeof process')()`,
        {console: consoleFns},
        {timeout: 500},
      ),
    );
  });

  it('should block constructor chaining on nested methods (e.g. driver.deleteSession)', function () {
    const host = Object.create(Object.prototype);
    host.deleteSession = () => {};
    const d = wrapHostBindingForVmContext(host);
    assert.throws(() =>
      vm.runInNewContext(
        `const m = d.deleteSession;
         const func = m.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should block host Function escape when reading a configurable function-valued property (someMethod)', function () {
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

    assert.throws(() =>
      vm.runInNewContext(
        `const m = d.someMethod;
         const func = m.constructor.constructor;
         func('return typeof process')();`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should block constructor chaining on .bind() results', function () {
    const host = Object.create(Object.prototype);
    host.fn = (x: unknown) => x;
    const d = wrapHostBindingForVmContext(host);
    assert.throws(() =>
      vm.runInNewContext(
        `const b = d.fn.bind(d);
         const func = b.constructor.constructor;
         func('return typeof process')()`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should wrap descriptor values from getOwnPropertyDescriptor and preserve attributes', function () {
    const host = Object.create(null);
    Object.defineProperty(host, 'm', {
      value: () => {},
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const d = wrapHostBindingForVmContext(host);
    const check = JSON.parse(
      vm.runInNewContext(
        `const desc = Object.getOwnPropertyDescriptor(d, 'm');
         JSON.stringify({
           hasValue: Boolean(desc && typeof desc.value === 'function'),
           configurable: desc?.configurable,
           enumerable: desc?.enumerable,
           writable: desc?.writable,
           ctorType: typeof desc?.value?.constructor?.constructor,
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );
    assert.deepEqual(check, {
      hasValue: true,
      configurable: true,
      enumerable: true,
      writable: true,
      ctorType: 'undefined',
    });
  });

  it('should wrap non-configurable data descriptors (e.g. driver.commandList) while preserving descriptor flags', function () {
    const host = Object.create(Object.prototype);
    Object.defineProperty(host, 'commandList', {
      value: ['status', 'findElement'],
      writable: false,
      enumerable: false,
      configurable: false,
    });
    const d = wrapHostBindingForVmContext(host);

    const check = JSON.parse(
      vm.runInNewContext(
        `const desc = Object.getOwnPropertyDescriptor(d, 'commandList');
         JSON.stringify({
           items: Array.from(d.commandList),
           isArray: Array.isArray(d.commandList),
           configurable: desc?.configurable,
           enumerable: desc?.enumerable,
           writable: desc?.writable,
           ctorType: typeof desc?.value?.constructor?.constructor,
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );
    assert.deepEqual(check, {
      items: ['status', 'findElement'],
      isArray: true,
      configurable: false,
      enumerable: false,
      writable: false,
      ctorType: 'undefined',
    });
  });

  it('should wrap non-configurable accessor descriptors from getOwnPropertyDescriptor while preserving flags', function () {
    const host = Object.create(Object.prototype);
    Object.defineProperty(host, 'roGetter', {
      get: () => ({nested: true}),
      enumerable: true,
      configurable: false,
    });
    const d = wrapHostBindingForVmContext(host);

    const check = JSON.parse(
      vm.runInNewContext(
        `const desc = Object.getOwnPropertyDescriptor(d, 'roGetter');
         JSON.stringify({
           hasGetter: typeof desc?.get === 'function',
           configurable: desc?.configurable,
           enumerable: desc?.enumerable,
           ctorType: typeof desc?.get?.constructor?.constructor,
           valueCtorType: typeof desc?.get?.()?.constructor?.constructor,
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );
    assert.deepEqual(check, {
      hasGetter: true,
      configurable: false,
      enumerable: true,
      ctorType: 'undefined',
      valueCtorType: 'undefined',
    });
  });

  it('should handle defineProperty with non-configurable data, accessor, partial, and array length descriptors', function () {
    const host: Record<string, unknown> = {
      a: 1,
      b: 2,
      arr: [10, 20, 30],
      f: Object.freeze(function frozenFn() {}),
    };
    Object.defineProperty(host, 'commandList', {
      value: 'fixed',
      writable: false,
      enumerable: false,
      configurable: false,
    });
    const d = wrapHostBindingForVmContext(host);

    const result = JSON.parse(
      vm.runInNewContext(
        `Object.defineProperty(d, 'x', {value: 1, writable: false, configurable: false});
         const vmObj = {nested: 7};
         const definedObj = Reflect.defineProperty(d, 'objProp', {
           value: vmObj,
           writable: false,
           configurable: false,
         });
         const objPropDesc = Object.getOwnPropertyDescriptor(d, 'objProp');
         let getterVal = 42;
         Object.defineProperty(d, 'acc', {get: () => getterVal, enumerable: true, configurable: false});
         Object.defineProperty(d, 'a', {configurable: false});
         Object.defineProperty(d, 'commandList', {value: 'fixed'});
         Object.defineProperty(d.f, 'prototype', {writable: false});
         Object.defineProperty(d.arr, 'length', {writable: false, configurable: false});
         JSON.stringify({
           xDesc: Object.getOwnPropertyDescriptor(d, 'x'),
           definedObj,
           objSameAsRead: d.objProp === vmObj,
           objSameAsDesc: objPropDesc?.value === vmObj,
           objDescFlags: {
             writable: objPropDesc?.writable,
             enumerable: objPropDesc?.enumerable,
             configurable: objPropDesc?.configurable,
           },
           accVal: d.acc,
           aDesc: Object.getOwnPropertyDescriptor(d, 'a'),
           keys: Object.keys(d),
           json: JSON.stringify({a: d.a, b: d.b}),
           arrLenDesc: Object.getOwnPropertyDescriptor(d.arr, 'length'),
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(result.xDesc, {
      value: 1,
      writable: false,
      enumerable: false,
      configurable: false,
    });
    assert.strictEqual(result.definedObj, true);
    assert.strictEqual(result.objSameAsRead, true);
    assert.strictEqual(result.objSameAsDesc, true);
    assert.deepEqual(result.objDescFlags, {
      writable: false,
      enumerable: false,
      configurable: false,
    });
    assert.strictEqual(result.accVal, 42);
    assert.deepEqual(result.aDesc, {
      value: 1,
      writable: true,
      enumerable: true,
      configurable: false,
    });
    assert.deepEqual(result.keys, ['a', 'b', 'arr', 'f', 'acc']);
    assert.strictEqual(result.json, '{"a":1,"b":2}');
    assert.deepEqual(result.arrLenDesc, {
      value: 3,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  });

  it('should support Object.freeze, Object.seal, Object.preventExtensions, and extensibility checks', function () {
    const host = {
      obj: {a: 1, b: 2},
      sealed: {x: 10},
      ext: {y: 20},
      removable: {
        x: 1 as number | undefined,
        remove() {
          delete this.x;
        },
      },
      arr: [1, 2],
      frozenArr: Object.freeze([3, 4]),
    };
    const d = wrapHostBindingForVmContext(host);

    const result = JSON.parse(
      vm.runInNewContext(
        `Object.freeze(d.obj);
         Object.seal(d.sealed);
         Object.preventExtensions(d.ext);
         Object.preventExtensions(d.removable);
         d.removable.remove();
         Object.freeze(d.arr);
         JSON.stringify({
           objFrozen: Object.isFrozen(d.obj),
           objExtensible: Object.isExtensible(d.obj),
           objKeys: Object.keys(d.obj),
           sealedIsSealed: Object.isSealed(d.sealed),
           extIsExtensible: Object.isExtensible(d.ext),
           extKeys: Object.keys(d.ext),
           extDesc: Object.getOwnPropertyDescriptor(d.ext, 'y'),
           extProto: Object.getPrototypeOf(d.ext) !== null,
           removableHasX: 'x' in d.removable,
           arrFrozen: Object.isFrozen(d.arr),
           frozenArrFrozen: Object.isFrozen(d.frozenArr),
           frozenArrExtensible: Object.isExtensible(d.frozenArr),
           frozenArrLenDesc: Object.getOwnPropertyDescriptor(d.frozenArr, 'length'),
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(result, {
      objFrozen: true,
      objExtensible: false,
      objKeys: ['a', 'b'],
      sealedIsSealed: true,
      extIsExtensible: false,
      extKeys: ['y'],
      extDesc: {value: 20, writable: true, enumerable: true, configurable: true},
      extProto: true,
      removableHasX: false,
      arrFrozen: true,
      frozenArrFrozen: true,
      frozenArrExtensible: false,
      frozenArrLenDesc: {value: 2, writable: false, enumerable: false, configurable: false},
    });
  });

  it('should support bound constructors and native Proxy without fabricating own prototype', function () {
    class Foo {
      public v: unknown;
      constructor(v: unknown) {
        this.v = v;
      }
    }
    const BoundFoo = Foo.bind(null);
    const noOwnProto = Object.assign(() => 1, {});
    Object.setPrototypeOf(noOwnProto, {prototype: {inherited: true}});

    const host = {
      BoundFoo,
      P: Proxy,
      w: noOwnProto,
    };
    const d = wrapHostBindingForVmContext(host);

    const result = JSON.parse(
      vm.runInNewContext(
        `const inst = new d.BoundFoo('ok');
         const proxied = new d.P({k: 9}, {});
         JSON.stringify({
           instV: inst.v,
           proxiedK: proxied.k,
           boundHasOwnProto: Object.prototype.hasOwnProperty.call(d.BoundFoo, 'prototype'),
           wOwnProtoDesc: Object.getOwnPropertyDescriptor(d.w, 'prototype'),
           wOwnKeysHasProto: Reflect.ownKeys(d.w).includes('prototype'),
           deleteWProto: delete d.w.prototype,
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(result, {
      instV: 'ok',
      proxiedK: 9,
      boundHasOwnProto: false,
      wOwnKeysHasProto: false,
      deleteWProto: true,
    });
  });

  it('should wrap host exceptions thrown from construct, get, set, apply, and deleteProperty traps', function () {
    const host: Record<string, unknown> = {
      *g() {
        yield 1;
      },
      throwFn() {
        throw new TypeError('boom');
      },
    };
    Object.defineProperty(host, 'badProp', {
      get() {
        throw new Error('getter boom');
      },
      set() {
        throw new Error('setter boom');
      },
      configurable: true,
    });
    const d = wrapHostBindingForVmContext(host);

    const results = JSON.parse(
      vm.runInNewContext(
        `const checks = [];
         for (const fn of [
           () => new d.g(),
           () => d.throwFn(),
           () => d.badProp,
           () => { d.badProp = 1; },
         ]) {
           try {
             fn();
             checks.push('did-not-throw');
           } catch (e) {
             const processType = typeof e?.constructor?.constructor === 'function'
               ? e.constructor.constructor('return typeof process')()
               : 'undefined';
             checks.push(processType);
           }
         }
         JSON.stringify(checks)`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(results, ['undefined', 'undefined', 'undefined', 'undefined']);
  });

  it('should wrap arguments passed to VM callbacks from host methods (e.g. Array.prototype.forEach)', function () {
    const host = {
      arr: [{secret: 'a'}, {secret: 'b'}],
    };
    const d = wrapHostBindingForVmContext(host);

    const check = JSON.parse(
      vm.runInNewContext(
        `const results = [];
         d.arr.forEach(function (item) {
           const escaped = typeof item?.constructor?.constructor === 'function'
             ? item.constructor.constructor('return typeof process')()
             : 'blocked';
           results.push(escaped);
         });
         JSON.stringify(results)`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(check, ['blocked', 'blocked']);
  });

  it('should preserve function source for WebdriverIO driver.execute script serialization', function () {
    const host = {
      execute(script: string | ((...args: unknown[]) => unknown), ...args: unknown[]) {
        const serialized = typeof script === 'function' ? `return (${script}).apply(null, arguments)` : script;
        return vm.runInNewContext(`(function () { ${serialized} }).apply(null, args)`, {args});
      },
    };
    const d = wrapHostBindingForVmContext(host);

    const value = vm.runInNewContext(`d.execute(() => 42)`, {d}, {timeout: 500});
    assert.strictEqual(value, 42);
  });

  it('should refuse set, deleteProperty, and defineProperty on constructor and __proto__', function () {
    const host: Record<string, unknown> = {a: 1};
    const d = wrapHostBindingForVmContext(host);

    const result = JSON.parse(
      vm.runInNewContext(
        `JSON.stringify({
           setCtor: Reflect.set(d, 'constructor', 123),
           setProto: Reflect.set(d, '__proto__', {}),
           delCtor: Reflect.deleteProperty(d, 'constructor'),
           delProto: Reflect.deleteProperty(d, '__proto__'),
           defCtor: Reflect.defineProperty(d, 'constructor', {value: 1}),
           defProto: Reflect.defineProperty(d, '__proto__', {value: 1}),
           hasCtor: 'constructor' in d,
           hasProto: '__proto__' in d,
           ownDescriptorCtor: Object.getOwnPropertyDescriptor(d, 'constructor') ?? null,
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(result, {
      setCtor: false,
      setProto: false,
      delCtor: false,
      delProto: false,
      defCtor: false,
      defProto: false,
      hasCtor: false,
      hasProto: false,
      ownDescriptorCtor: null,
    });
  });

  it('should forward property writes, unwrap proxied values on set, deletes, and key enumeration to the host target', function () {
    const original = {tag: 'inner'};
    const host: Record<string, unknown> = {a: 1, b: 2, orig: original};
    const d = wrapHostBindingForVmContext(host);
    const keys = vm.runInNewContext(
      `d.c = d.orig;
       delete d.a;
       Object.keys(d);`,
      {d},
      {timeout: 500},
    );
    assert.deepEqual(Array.from(keys as string[]), ['b', 'orig', 'c']);
    assert.strictEqual(host.a, undefined);
    assert.strictEqual(host.c, original);
  });

  it('should preserve identity for repeated reads of the same nested method', function () {
    const host = Object.create(Object.prototype);
    host.m = () => {};
    const d = wrapHostBindingForVmContext(host);
    const same = vm.runInNewContext(`d.m === d.m`, {d}, {timeout: 500});
    assert.strictEqual(same, true);
  });

  it('should unwrap proxied arguments before invoking host functions', function () {
    const original = {id: 'host-object'};
    const host = {
      provide() {
        return original;
      },
      consume(arg: unknown) {
        return arg === original;
      },
    };
    const d = wrapHostBindingForVmContext(host);
    const roundTripsAsOriginal = vm.runInNewContext(
      `const value = d.provide();
       d.consume(value);`,
      {d},
      {timeout: 500},
    );
    assert.strictEqual(roundTripsAsOriginal, true);
  });

  it('should unwrap proxied arguments before invoking host constructors via new', function () {
    const original = {id: 'ctor-arg'};
    const host = {
      Box: class Box {
        public arg: unknown;
        constructor(arg: unknown) {
          this.arg = arg;
        }
      },
      provide() {
        return original;
      },
      isOriginal(value: unknown) {
        return value === original;
      },
    };
    const d = wrapHostBindingForVmContext(host);
    const ctorArgRoundTripsAsOriginal = vm.runInNewContext(
      `const value = d.provide();
       const box = new d.Box(value);
       d.isOriginal(box.arg);`,
      {d},
      {timeout: 500},
    );
    assert.strictEqual(ctorArgRoundTripsAsOriginal, true);
  });

  it('should preserve VM subclass constructors passed as newTarget when extending a wrapped host constructor', function () {
    const Box = function (this: {v: unknown}, v: unknown) {
      this.v = v;
    } as unknown as new (v: unknown) => {v: unknown};
    const d = wrapHostBindingForVmContext({Box});
    const result = vm.runInNewContext(
      `class Sub extends d.Box {
         twice() {
           return this.v * 2;
         }
       }
       new Sub(21).twice();`,
      {d},
      {timeout: 500},
    );
    assert.strictEqual(result, 42);
  });

  it('should preserve VM-originated error identity and instanceof when thrown through a host trap', function () {
    const d = wrapHostBindingForVmContext({arr: [1]});
    const ok = vm.runInNewContext(
      `class MyError extends Error {}
       const original = new MyError('x');
       let caught;
       try {
         d.arr.forEach(() => {
           throw original;
         });
       } catch (e) {
         caught = e;
       }
       caught === original && caught instanceof MyError;`,
      {d},
      {timeout: 500},
    );
    assert.strictEqual(ok, true);
  });

  it('should preserve constructibility, async branding, name, length, static receiver, and wrapper identity for VM callables', async function () {
    let seenWrapper1: unknown;
    let seenWrapper2: unknown;
    const host = {
      Base: class Base {
        static get who() {
          return this;
        }
      },
      instantiate(Ctor: new (v: number) => {val: number}, v: number) {
        return new Ctor(v);
      },
      inspectAsync(fn: (...args: unknown[]) => unknown) {
        return {
          isAsync: types.isAsyncFunction(fn),
          name: fn.name,
          length: fn.length,
        };
      },
      rememberFirst(fn: unknown) {
        seenWrapper1 = fn;
        return fn;
      },
      rememberSecond(fn: unknown) {
        seenWrapper2 = fn;
      },
    };
    const d = wrapHostBindingForVmContext(host);

    const res = JSON.parse(
      vm.runInNewContext(
        `class Foo {
           constructor(v) {
             this.val = v * 3;
           }
         }
         class Sub extends d.Base {}
         async function myTask(a, b) {
           return a + b;
         }
         const cb = function onEvent(x) { return x; };
         const echoed = d.rememberFirst(cb);
         d.rememberSecond(echoed);
         const inst = d.instantiate(Foo, 7);
         const meta = d.inspectAsync(myTask);
         JSON.stringify({
           isFoo: inst instanceof Foo,
           val: inst.val,
           subReceiverMatches: Sub.who === Sub,
           echoedMatchesCb: echoed === cb,
           meta,
         });`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(res, {
      isFoo: true,
      val: 21,
      subReceiverMatches: true,
      echoedMatchesCb: true,
      meta: {
        isAsync: true,
        name: 'myTask',
        length: 2,
      },
    });
    assert.strictEqual(seenWrapper1, seenWrapper2);
  });

  it('should not double-wrap function proxies', function () {
    const fn = function hostFn() {
      return 1;
    };
    const wrapped = wrapHostBindingForVmContext(fn);
    const wrappedAgain = wrapHostBindingForVmContext(wrapped);
    assert.strictEqual(wrappedAgain, wrapped);
  });

  it('should still await Promise results from wrapped methods', async function () {
    const host = Object.create(Object.prototype);
    host.p = () => Promise.resolve(7);
    const d = wrapHostBindingForVmContext(host);
    const v = vm.runInNewContext(`(async () => await d.p())()`, {d}, {timeout: 500}) as Promise<number>;
    assert.strictEqual(await v, 7);
  });

  it('should block constructor chaining on values fulfilled from wrapped Promises', async function () {
    const host = Object.create(Object.prototype);
    host.p = () => Promise.resolve({x: 1});
    const d = wrapHostBindingForVmContext(host);
    await assert.rejects(
      vm.runInNewContext(
        `(async () => {
          const v = await d.p();
          const func = v.constructor.constructor;
          func('return typeof process')();
        })()`,
        {d},
        {timeout: 500},
      ),
    );
  });

  it('should keep VM functions on VM receivers, resync preventExtensions deletions, and wrap null-proto chains', function () {
    const nonExtHost: Record<string, unknown> = Object.preventExtensions({a: 1, b: 2});
    const nullProtoBase = Object.create(null);
    nullProtoBase.fn = function () {
      return 'from-null-proto';
    };
    const nullProtoChild = Object.create(nullProtoBase);
    class HostFoo {}
    const d = wrapHostBindingForVmContext({
      x: 1,
      Foo: HostFoo,
      nonExtHost,
      nullProtoChild,
      echo(v: unknown) {
        return v;
      },
      deleteHostA() {
        delete nonExtHost.a;
      },
    });

    const res = JSON.parse(
      vm.runInNewContext(
        `const o = Object.create(d);
         const fn = function () {};
         o.cb = fn;
         class X extends d.Foo {}
         const x = new X();
         x.cb = fn;
         const keysBefore = Object.keys(d.nonExtHost);
         d.deleteHostA();
         const keysAfter = Object.keys(d.nonExtHost);
         const vmNullBase = Object.create(null);
         const vmNullChild = Object.create(vmNullBase);
         JSON.stringify({
           oCbSame: o.cb === fn,
           oCbProcessType: o.cb.constructor.constructor('return typeof process')(),
           xCbSame: x.cb === fn,
           xCbProcessType: x.cb.constructor.constructor('return typeof process')(),
           keysBefore,
           keysAfter,
           nullProtoFnVal: d.nullProtoChild.fn(),
           nullProtoFnCtorProto: Object.getPrototypeOf(d.nullProtoChild.fn.constructor),
           vmNullChildRoundTrip: d.echo(vmNullChild) === vmNullChild,
         })`,
        {d},
        {timeout: 500},
      ) as string,
    );

    assert.deepEqual(res, {
      oCbSame: true,
      oCbProcessType: 'undefined',
      xCbSame: true,
      xCbProcessType: 'undefined',
      keysBefore: ['a', 'b'],
      keysAfter: ['b'],
      nullProtoFnVal: 'from-null-proto',
      nullProtoFnCtorProto: null,
      vmNullChildRoundTrip: true,
    });
  });
});
