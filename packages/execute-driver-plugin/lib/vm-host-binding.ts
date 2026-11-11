/**
 * @fileoverview Deep-proxy bridge for host objects exposed to `vm.runInNewContext`.
 * Wraps nested return values, descriptors (via structural shadow targets), Promises,
 * and VM callback boundaries while hiding `constructor` and `__proto__` prototype chains.
 * Node's `vm` is not a full security boundary; keep `execute_driver_script` behind `--allow-insecure`.
 */

import {types} from 'node:util';

/**
 * Null-prototype object returned for prototype-adjacent property lookups on
 * proxied host values. It must not inherit `Object.prototype` (which would
 * reintroduce `constructor` / `__proto__` chains back to the host `Function`).
 */
const SAFE_LOOKUP_TARGET: object = Object.freeze(Object.create(null));

/**
 * Any host-realm callable (methods, timers, `console.log`, etc.) that may be wrapped
 * and passed into the VM alongside plain objects.
 */
type HostCallable = (...args: unknown[]) => unknown;
type HostTarget = object | HostCallable;
type HostConstructor = new (...args: unknown[]) => object;

/** Host target → single deep proxy (stable identity, cycle-safe). */
const targetToProxy = new WeakMap<HostTarget, object>();

/** Deep proxy → underlying host target (unwrap `this` / receivers / defineProperty). */
const proxyToTarget = new WeakMap<object, HostTarget>();

/** Proxy shadow target → underlying host target for the shared `DEEP_HANDLER`. */
const shadowToHost = new WeakMap<HostTarget, HostTarget>();

const vmFnToHostWrapper = new WeakMap<HostCallable, HostCallable>();
const vmObjects = new WeakSet<HostTarget>();
const promiseToThenableHost = new WeakMap<Promise<unknown>, object>();

const CONSTRUCTOR_TEST_TARGET = new Proxy(function () {}, {
  construct() {
    return {};
  },
});

/**
 * Entry point: wrap a host object or function for use as a global in `vm.runInNewContext`.
 *
 * Delegates to {@link wrapDeep}; see the file-level overview for behavior and limitations.
 *
 * @typeParam T - Host object or function type (returned value is proxied but typed as `T`).
 * @param hostValue - Root binding injected into the VM (e.g. WebdriverIO `driver`, `console`).
 * @returns A proxy whose transitive property/call/descriptor surfaces hide host `Function` leaks.
 */
export function wrapHostBindingForVmContext<T extends HostTarget>(hostValue: T): T {
  return wrapDeep(hostValue);
}

function isOurProxy(value: unknown): value is HostTarget {
  return value !== null && (typeof value === 'object' || typeof value === 'function') && proxyToTarget.has(value);
}

function isVmRealmValue(value: unknown): boolean {
  return value !== null && (typeof value === 'object' || typeof value === 'function') && vmObjects.has(value);
}

function isVmObjectPrototype(proto: object): boolean {
  if (proto === Object.prototype || proto === SAFE_LOOKUP_TARGET) {
    return false;
  }
  try {
    if (Reflect.getPrototypeOf(proto) !== null) {
      return false;
    }
    const ctorDesc = Reflect.getOwnPropertyDescriptor(proto, 'constructor');
    const ctor = ctorDesc && 'value' in ctorDesc ? ctorDesc.value : undefined;
    if (typeof ctor !== 'function' || isOurProxy(ctor)) {
      return false;
    }
    const fnProto = Reflect.getPrototypeOf(ctor);
    return fnProto !== null && fnProto !== Function.prototype && Reflect.getPrototypeOf(fnProto) === proto;
  } catch {
    return false;
  }
}

function hasVmRealmPrototype(value: object): boolean {
  let current: object | null = value;
  for (let depth = 0; current !== null && depth < 64; depth++) {
    if (current === Object.prototype || current === Function.prototype || current === Error.prototype) {
      return false;
    }
    if (current === SAFE_LOOKUP_TARGET || shadowToHost.has(current)) {
      return false;
    }
    if (isOurProxy(current)) {
      return depth > 0;
    }
    if (isVmObjectPrototype(current)) {
      return true;
    }
    try {
      current = Reflect.getPrototypeOf(current);
    } catch {
      return false;
    }
  }
  return false;
}

function recordVmValue(value: unknown): void {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return;
  }
  if (
    value === SAFE_LOOKUP_TARGET ||
    isOurProxy(value) ||
    targetToProxy.has(value) ||
    shadowToHost.has(value) ||
    promiseToThenableHost.has(value as Promise<unknown>) ||
    !hasVmRealmPrototype(value)
  ) {
    return;
  }
  vmObjects.add(value);
}

function wrapErrorForVm(err: unknown): unknown {
  if (isOurProxy(err) || isVmRealmValue(err)) {
    return err;
  }
  try {
    return wrapIfNeeded(err);
  } catch {
    return FALLBACK_WRAPPED_ERROR;
  }
}

function copyFunctionMetadata(vmFn: HostCallable, wrapped: HostCallable, includePrototype: boolean): void {
  for (const key of ['length', 'name'] as const) {
    const desc = Reflect.getOwnPropertyDescriptor(vmFn, key);
    if (desc) {
      Reflect.defineProperty(wrapped, key, mapDescriptorForHost(desc));
    }
  }
  if (includePrototype) {
    const protoDesc = Reflect.getOwnPropertyDescriptor(vmFn, 'prototype');
    if (protoDesc && 'value' in protoDesc) {
      Reflect.defineProperty(wrapped, 'prototype', {
        value: unwrapIfProxy(protoDesc.value),
        writable: Boolean(protoDesc.writable),
      });
    }
  }
  Object.defineProperty(wrapped, 'toString', {
    value: () => Function.prototype.toString.call(vmFn),
    configurable: true,
    writable: true,
  });
}

function runVmCallback(
  thisArg: unknown,
  args: unknown[],
  op: (safeThis: unknown, safeArgs: unknown[]) => unknown,
  awaitResult = false,
): unknown {
  const safeThis = wrapIfNeeded(thisArg);
  const safeArgs = args.map((arg) => wrapIfNeeded(arg));
  try {
    const raw = op(safeThis, safeArgs);
    return awaitResult
      ? Promise.resolve(raw)
          .then((val) => unwrapIfProxy(val))
          .catch((err: unknown) => {
            recordVmValue(err);
            throw wrapErrorForVm(err);
          })
      : unwrapIfProxy(raw);
  } catch (err) {
    recordVmValue(err);
    throw wrapErrorForVm(err);
  }
}

function wrapVmFunctionForHost(vmFn: HostCallable): HostCallable {
  const cached = vmFnToHostWrapper.get(vmFn);
  if (cached) {
    return cached;
  }
  recordVmValue(vmFn);

  const applyVm = (safeThis: unknown, safeArgs: unknown[]): unknown => Reflect.apply(vmFn, safeThis, safeArgs);
  const constructible = isConstructibleFunction(vmFn);
  let wrapped: HostCallable;
  if (types.isAsyncFunction(vmFn)) {
    wrapped = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      return await (runVmCallback(this, args, applyVm, true) as Promise<unknown>);
    };
  } else if (constructible) {
    wrapped = function (this: unknown, ...args: unknown[]): unknown {
      if (new.target) {
        const actualNewTarget =
          new.target === wrapped ? (vmFn as unknown as HostConstructor) : (wrapIfNeeded(new.target) as HostConstructor);
        return runVmCallback(undefined, args, (_this, safeArgs) =>
          Reflect.construct(vmFn as unknown as HostConstructor, safeArgs, actualNewTarget),
        );
      }
      return runVmCallback(this, args, applyVm);
    };
  } else {
    wrapped = {
      callVm(this: unknown, ...args: unknown[]): unknown {
        return runVmCallback(this, args, applyVm);
      },
    }.callVm;
  }

  copyFunctionMetadata(vmFn, wrapped, constructible);
  vmFnToHostWrapper.set(vmFn, wrapped);
  targetToProxy.set(wrapped, vmFn);
  proxyToTarget.set(wrapped, vmFn);
  return wrapped;
}

/**
 * Maps a value crossing from the VM into the host:
 * - Unwraps proxies created by this module back to their underlying host target.
 * - Wraps VM-realm functions so host callers cannot hand raw host `this`/arguments back to them.
 * - Tracks VM-originated objects in `vmObjects` so they round-trip back to the VM unchanged.
 */
function unwrapIfProxy<T>(value: T): T {
  if (isOurProxy(value)) {
    const target = proxyToTarget.get(value) as T;
    if (
      typeof target === 'function' &&
      vmFnToHostWrapper.get(target as unknown as HostCallable) === (value as unknown)
    ) {
      return value;
    }
    return target;
  }
  if (typeof value === 'function') {
    if (targetToProxy.has(value)) {
      return value;
    }
    return wrapVmFunctionForHost(value as unknown as HostCallable) as unknown as T;
  }
  recordVmValue(value);
  return value;
}

/** Property keys that must never resolve through the real target (VM escape vectors). */
function isBlockedPrototypeKey(prop: string | symbol): boolean {
  return prop === 'constructor' || prop === '__proto__';
}

/** Whether `value` is a native host Promise (handled via thenable facade, not `wrapDeep` alone). */
function isNativePromise(value: object): value is Promise<unknown> {
  return value instanceof Promise;
}

/**
 * Executes a trap operation and ensures any thrown host-realm error is wrapped via
 * {@link wrapIfNeeded} before crossing into the VM catch block.
 */
function runTrapSafely<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    throw wrapErrorForVm(err);
  }
}

/**
 * Wraps a host Promise by exposing a null-prototype thenable that delegates to `p` and ensures
 * fulfillment/rejection values are passed through {@link wrapIfNeeded} before VM callbacks run.
 *
 * @param p - Host promise returned from driver or other host APIs.
 * @returns A deep-proxied thenable safe for `await` / `.then` from inside the VM.
 */
function wrapPromiseAsThenable(p: Promise<unknown>): unknown {
  const cached = promiseToThenableHost.get(p);
  const hostObj: object =
    cached ??
    (() => {
      /* eslint-disable unicorn/no-thenable,promise/prefer-await-to-then -- thenable facade over a host Promise */
      const o = Object.assign(Object.create(null), {
        then(onFulfilled?: unknown, onRejected?: unknown) {
          const adaptFulfill =
            onFulfilled != null && typeof onFulfilled === 'function'
              ? (v: unknown) => Reflect.apply(onFulfilled as HostCallable, undefined, [wrapIfNeeded(v)])
              : (v: unknown) => wrapIfNeeded(v);
          const adaptReject =
            onRejected != null && typeof onRejected === 'function'
              ? (e: unknown) => Reflect.apply(onRejected as HostCallable, undefined, [wrapIfNeeded(e)])
              : undefined;
          return wrapIfNeeded(p.then(adaptFulfill, adaptReject));
        },
        catch(onRejected?: unknown) {
          return wrapIfNeeded(
            p.catch((e: unknown) =>
              onRejected != null && typeof onRejected === 'function'
                ? Reflect.apply(onRejected as HostCallable, undefined, [wrapIfNeeded(e)])
                : Promise.reject(wrapIfNeeded(e)),
            ),
          );
        },
        finally(onFinally?: unknown) {
          return wrapIfNeeded(p.finally(onFinally as () => void | PromiseLike<void> | undefined));
        },
      });
      /* eslint-enable unicorn/no-thenable,promise/prefer-await-to-then */
      promiseToThenableHost.set(p, o);
      return o;
    })();
  return wrapDeep(hostObj);
}

/**
 * Tests whether a callable has an internal `[[Construct]]` slot without throwing on common
 * non-constructible callables (async functions, generators, arrow functions, concise methods).
 */
function isConstructibleFunction(fn: HostCallable): boolean {
  if (types.isAsyncFunction(fn) || types.isGeneratorFunction(fn)) {
    return false;
  }
  if ((fn as unknown) === Proxy || Reflect.getOwnPropertyDescriptor(fn, 'prototype') !== undefined) {
    return true;
  }
  const nameDesc = Reflect.getOwnPropertyDescriptor(fn, 'name');
  const fnName = nameDesc && 'value' in nameDesc ? nameDesc.value : undefined;
  if (!types.isProxy(fn) && typeof fnName === 'string' && !fnName.startsWith('bound ')) {
    return false;
  }
  try {
    Reflect.construct(CONSTRUCTOR_TEST_TARGET, [], fn);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a clean shadow target matching the structural kind of `hostTarget` (function, array,
 * or plain object) so V8 Proxy invariants are checked against the shadow target while keeping
 * its prototype aligned with `SAFE_LOOKUP_TARGET`.
 *
 * For constructible functions, uses a bound function `(function () {}).bind(null)` so the shadow
 * target has `[[Construct]]` without a fabricated non-configurable own `.prototype` property.
 */
function createShadowTarget(hostTarget: HostTarget): HostTarget {
  let shadow: HostTarget;
  if (typeof hostTarget === 'function') {
    shadow = isConstructibleFunction(hostTarget as HostCallable) ? function () {}.bind(null) : () => {};
  } else if (Array.isArray(hostTarget)) {
    shadow = [];
  } else {
    shadow = {};
  }
  Reflect.setPrototypeOf(shadow, SAFE_LOOKUP_TARGET);
  return shadow;
}

/**
 * Clones a host property descriptor so `value` / `get` / `set` are wrapped for the VM while
 * preserving the host descriptor's real `configurable`, `enumerable`, and `writable` flags.
 */
function mapDescriptorForSandbox(descriptor: PropertyDescriptor): PropertyDescriptor {
  if ('value' in descriptor) {
    return {
      configurable: Boolean(descriptor.configurable),
      enumerable: Boolean(descriptor.enumerable),
      writable: Boolean(descriptor.writable),
      value: wrapIfNeeded(descriptor.value),
    };
  }
  return {
    configurable: Boolean(descriptor.configurable),
    enumerable: Boolean(descriptor.enumerable),
    get: descriptor.get ? (wrapIfNeeded(descriptor.get) as () => unknown) : undefined,
    set: descriptor.set ? (wrapIfNeeded(descriptor.set) as (v: unknown) => void) : undefined,
  };
}

/**
 * Synchronizes a single property from `hostTarget` onto `shadowTarget` when required by V8
 * Proxy invariants (e.g. non-configurable properties, array `length`, or non-extensible targets).
 */
function syncShadowProperty(
  shadowTarget: HostTarget,
  hostTarget: HostTarget,
  prop: string | symbol,
): PropertyDescriptor | undefined {
  const hostDesc = Reflect.getOwnPropertyDescriptor(hostTarget, prop);
  if (!hostDesc) {
    const shadowDesc = Reflect.getOwnPropertyDescriptor(shadowTarget, prop);
    if (shadowDesc?.configurable) {
      Reflect.deleteProperty(shadowTarget, prop);
    }
    return undefined;
  }
  const wrappedDesc = mapDescriptorForSandbox(hostDesc);
  const shadowDesc = Reflect.getOwnPropertyDescriptor(shadowTarget, prop);
  if (!wrappedDesc.configurable || shadowDesc !== undefined || !Reflect.isExtensible(shadowTarget)) {
    Reflect.defineProperty(shadowTarget, prop, wrappedDesc);
  }
  return wrappedDesc;
}

/**
 * Synchronizes all own properties and non-extensibility from `hostTarget` onto `shadowTarget`.
 * Returns early once `shadowTarget` is already frozen, or sealed while `hostTarget` is not frozen.
 */
function syncShadowExtensibility(shadowTarget: HostTarget, hostTarget: HostTarget): void {
  if (Object.isFrozen(shadowTarget) || (Object.isSealed(shadowTarget) && !Object.isFrozen(hostTarget))) {
    return;
  }
  const hostKeys = Reflect.ownKeys(hostTarget).filter((key) => !isBlockedPrototypeKey(key));
  const hostKeySet = new Set<string | symbol>(hostKeys);
  for (const shadowKey of Reflect.ownKeys(shadowTarget)) {
    if (!hostKeySet.has(shadowKey)) {
      const shadowDesc = Reflect.getOwnPropertyDescriptor(shadowTarget, shadowKey);
      if (shadowDesc?.configurable) {
        Reflect.deleteProperty(shadowTarget, shadowKey);
      }
    }
  }
  for (const key of hostKeys) {
    const hostDesc = Reflect.getOwnPropertyDescriptor(hostTarget, key);
    if (hostDesc) {
      Reflect.defineProperty(shadowTarget, key, mapDescriptorForSandbox(hostDesc));
    }
  }
  if (!Reflect.isExtensible(hostTarget)) {
    Reflect.preventExtensions(shadowTarget);
  }
}

function findPropertyDescriptor(target: object, prop: string | symbol): PropertyDescriptor | undefined {
  let current: object | null = target;
  while (current !== null) {
    const desc = Reflect.getOwnPropertyDescriptor(current, prop);
    if (desc) {
      return desc;
    }
    current = Reflect.getPrototypeOf(current);
  }
  return undefined;
}

/**
 * Prepares a property descriptor coming **from** the VM so `Reflect.defineProperty` on the host
 * receives real targets, not our proxy objects.
 */
function mapDescriptorForHost(descriptor: PropertyDescriptor): PropertyDescriptor {
  const mapped: PropertyDescriptor = {};
  if ('configurable' in descriptor) {
    mapped.configurable = descriptor.configurable;
  }
  if ('enumerable' in descriptor) {
    mapped.enumerable = descriptor.enumerable;
  }
  if ('writable' in descriptor) {
    mapped.writable = descriptor.writable;
  }
  if ('value' in descriptor) {
    mapped.value = unwrapIfProxy((descriptor as {value: unknown}).value);
  }
  if ('get' in descriptor) {
    mapped.get = unwrapIfProxy(descriptor.get) as (() => unknown) | undefined;
  }
  if ('set' in descriptor) {
    mapped.set = unwrapIfProxy(descriptor.set) as ((v: unknown) => void) | undefined;
  }
  return mapped;
}

/**
 * Unwraps the proxy when used as the `receiver` for `Reflect.get` / `Reflect.set`, preserving
 * VM subclass/object receivers without wrapping them as callback functions.
 */
function reflectReceiver(receiver: unknown): unknown {
  if (isOurProxy(receiver)) {
    return proxyToTarget.get(receiver);
  }
  recordVmValue(receiver);
  return receiver;
}

/**
 * Unwraps constructor references passed to `Reflect.construct`.
 * Preserves VM-defined subclass constructors (`newTarget`) instead of wrapping them as callbacks.
 */
function unwrapConstructor(newTarget: HostCallable): HostConstructor {
  if (isOurProxy(newTarget)) {
    return proxyToTarget.get(newTarget) as HostConstructor;
  }
  recordVmValue(newTarget);
  return newTarget as unknown as HostConstructor;
}

/**
 * Unwraps each argument before forwarding calls into host functions so VM-facing proxies
 * round-trip back to their original host targets and VM callbacks are wrapped for host calls.
 */
function unwrapArgList(argList: readonly unknown[]): unknown[] {
  return argList.map((arg) => unwrapIfProxy(arg));
}

/**
 * Looks up the real host target for a proxy's shadow target.
 */
function resolveHostTarget(shadowTarget: HostTarget): HostTarget {
  return shadowToHost.get(shadowTarget) ?? shadowTarget;
}

/**
 * Shared `ProxyHandler` for all wrapped host objects and functions.
 * Resolves `hostTarget` from `shadowTarget` via `shadowToHost`.
 */
const DEEP_HANDLER: ProxyHandler<HostTarget> = {
  apply(shadowTarget: HostTarget, thisArg: unknown, argArray: unknown[]): unknown {
    return runTrapSafely(() => {
      const hostFn = resolveHostTarget(shadowTarget) as HostCallable;
      const hostThis = unwrapIfProxy(thisArg);
      const hostArgs = unwrapArgList(argArray);
      const result = Reflect.apply(hostFn, hostThis, hostArgs);
      return wrapIfNeeded(result);
    });
  },

  construct(shadowTarget: HostTarget, argArray: unknown[], newTarget: unknown): object {
    return runTrapSafely(() => {
      const hostCtor = resolveHostTarget(shadowTarget) as HostConstructor;
      const hostArgs = unwrapArgList(argArray);
      const hostNewTarget = unwrapConstructor(newTarget as HostCallable);
      const result = Reflect.construct(hostCtor, hostArgs, hostNewTarget);
      return wrapIfNeeded(result) as object;
    });
  },

  defineProperty(shadowTarget: HostTarget, prop: string | symbol, descriptor: PropertyDescriptor): boolean {
    return runTrapSafely(() => {
      if (isBlockedPrototypeKey(prop)) {
        return false;
      }
      const hostTarget = resolveHostTarget(shadowTarget);
      const defined = Reflect.defineProperty(hostTarget, prop, mapDescriptorForHost(descriptor));
      if (defined) {
        syncShadowProperty(shadowTarget, hostTarget, prop);
      }
      return defined;
    });
  },

  deleteProperty(shadowTarget: HostTarget, prop: string | symbol): boolean {
    return runTrapSafely(() => {
      if (isBlockedPrototypeKey(prop)) {
        return false;
      }
      const hostTarget = resolveHostTarget(shadowTarget);
      const deleted = Reflect.deleteProperty(hostTarget, prop);
      if (deleted) {
        Reflect.deleteProperty(shadowTarget, prop);
      }
      return deleted;
    });
  },

  get(shadowTarget: HostTarget, prop: string | symbol, receiver: unknown): unknown {
    return runTrapSafely(() => {
      if (isBlockedPrototypeKey(prop)) {
        return SAFE_LOOKUP_TARGET;
      }
      const hostTarget = resolveHostTarget(shadowTarget);
      const value = Reflect.get(hostTarget, prop, reflectReceiver(receiver));
      const wrapped = wrapIfNeeded(value);
      const hostDesc = Reflect.getOwnPropertyDescriptor(hostTarget, prop);
      if (hostDesc && !hostDesc.configurable) {
        syncShadowProperty(shadowTarget, hostTarget, prop);
      }
      return wrapped;
    });
  },

  getOwnPropertyDescriptor(shadowTarget: HostTarget, prop: string | symbol): PropertyDescriptor | undefined {
    return runTrapSafely(() => {
      if (isBlockedPrototypeKey(prop)) {
        return undefined;
      }
      const hostTarget = resolveHostTarget(shadowTarget);
      if (!Reflect.isExtensible(hostTarget)) {
        syncShadowExtensibility(shadowTarget, hostTarget);
      }
      return syncShadowProperty(shadowTarget, hostTarget, prop);
    });
  },

  getPrototypeOf(_shadowTarget: HostTarget): object | null {
    return SAFE_LOOKUP_TARGET;
  },

  has(shadowTarget: HostTarget, prop: string | symbol): boolean {
    return runTrapSafely(() => {
      if (isBlockedPrototypeKey(prop)) {
        return false;
      }
      const hostTarget = resolveHostTarget(shadowTarget);
      const exists = Reflect.has(hostTarget, prop);
      if (!exists) {
        syncShadowProperty(shadowTarget, hostTarget, prop);
      }
      return exists;
    });
  },

  isExtensible(shadowTarget: HostTarget): boolean {
    return runTrapSafely(() => {
      const hostTarget = resolveHostTarget(shadowTarget);
      if (!Reflect.isExtensible(hostTarget)) {
        syncShadowExtensibility(shadowTarget, hostTarget);
      }
      return Reflect.isExtensible(shadowTarget);
    });
  },

  ownKeys(shadowTarget: HostTarget): Array<string | symbol> {
    return runTrapSafely(() => {
      const hostTarget = resolveHostTarget(shadowTarget);
      if (!Reflect.isExtensible(hostTarget)) {
        syncShadowExtensibility(shadowTarget, hostTarget);
      } else if (Array.isArray(hostTarget)) {
        syncShadowProperty(shadowTarget, hostTarget, 'length');
      }
      const hostKeys = Reflect.ownKeys(hostTarget).filter((key) => !isBlockedPrototypeKey(key));
      const hostKeySet = new Set<string | symbol>(hostKeys);
      for (const key of Reflect.ownKeys(shadowTarget)) {
        if (!hostKeySet.has(key)) {
          const shadowDesc = Reflect.getOwnPropertyDescriptor(shadowTarget, key);
          if (shadowDesc && !shadowDesc.configurable) {
            hostKeys.push(key);
          }
        }
      }
      return hostKeys;
    });
  },

  preventExtensions(shadowTarget: HostTarget): boolean {
    return runTrapSafely(() => {
      const hostTarget = resolveHostTarget(shadowTarget);
      if (!Reflect.preventExtensions(hostTarget)) {
        return false;
      }
      syncShadowExtensibility(shadowTarget, hostTarget);
      return true;
    });
  },

  set(shadowTarget: HostTarget, prop: string | symbol, value: unknown, receiver: unknown): boolean {
    return runTrapSafely(() => {
      if (isBlockedPrototypeKey(prop)) {
        return false;
      }
      const hostTarget = resolveHostTarget(shadowTarget);
      const actualReceiver = reflectReceiver(receiver);
      const desc = findPropertyDescriptor(hostTarget, prop);
      const invokesHostSetter = Boolean(desc && 'set' in desc && typeof desc.set === 'function');
      const writesToHost = actualReceiver === hostTarget || isOurProxy(receiver) || invokesHostSetter;
      const valueToSet = writesToHost ? unwrapIfProxy(value) : value;
      if (!writesToHost) {
        recordVmValue(value);
      }
      const updated = Reflect.set(hostTarget, prop, valueToSet, actualReceiver);
      if (
        updated &&
        actualReceiver === hostTarget &&
        Reflect.getOwnPropertyDescriptor(shadowTarget, prop) !== undefined
      ) {
        syncShadowProperty(shadowTarget, hostTarget, prop);
      }
      return updated;
    });
  },

  setPrototypeOf(_shadowTarget: HostTarget, _prototype: object | null): boolean {
    return false;
  },
};

/**
 * Returns the one deep proxy for this host target, creating and caching it on first use.
 *
 * @typeParam T - Host object or function type.
 * @param hostValue - Raw host reference (not a primitive).
 * @returns Cached or new proxy for `hostValue`.
 */
function wrapDeep<T extends HostTarget>(hostValue: T): T {
  if (typeof hostValue !== 'object' && typeof hostValue !== 'function') {
    return hostValue;
  }
  const cached = targetToProxy.get(hostValue);
  if (cached) {
    return cached as T;
  }
  if (isOurProxy(hostValue) || isVmRealmValue(hostValue)) {
    return hostValue as T;
  }
  const shadowTarget = createShadowTarget(hostValue);
  shadowToHost.set(shadowTarget, hostValue);
  const proxy = new Proxy(shadowTarget, DEEP_HANDLER);
  targetToProxy.set(hostValue, proxy);
  proxyToTarget.set(proxy, hostValue);
  return proxy as T;
}

/**
 * Recursively wraps objects and functions; leaves primitives and VM-originated values unchanged;
 * routes host Promises to the thenable facade.
 *
 * @param value - Result of a `get` / `apply` / descriptor field, or any nested host value.
 * @returns Wrapped proxy, thenable-wrapped promise pipeline, or the original primitive/VM value.
 */
function wrapIfNeeded(value: unknown): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }
  if (isVmRealmValue(value)) {
    return value;
  }
  if (typeof value === 'function') {
    return wrapDeep(value as HostCallable);
  }
  if (isNativePromise(value as object)) {
    return wrapPromiseAsThenable(value as Promise<unknown>);
  }
  return wrapDeep(value as HostTarget);
}

const FALLBACK_WRAPPED_ERROR: object = wrapDeep(new RangeError('Maximum call stack size exceeded'));
