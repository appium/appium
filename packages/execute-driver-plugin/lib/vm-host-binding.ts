/**
 * @fileoverview Bridges host-realm (child process) objects into Node's `vm.runInNewContext` without
 * leaking main-realm prototype metadata that untrusted script could use to obtain the real
 * `Function` constructor and escape the VM (RCE on the Appium host).
 *
 * ## Why this exists
 *
 * `vm` isolates *globals* and bytecode, but any **host object** you inject still carries the
 * **main V8 realm's** prototypes.
 *
 * ## Strategy (high level)
 *
 * 1. **Deep `Proxy`**: Every host object/function exposed to the script is wrapped. Property
 *    reads (`get`), call results (`apply` / `construct`), and—where allowed—descriptor reflection
 *    (`getOwnPropertyDescriptor`) funnel return values through `wrapIfNeeded`, which recursively
 *    wraps objects and functions so nested references never surface as raw host callables.
 *
 * 2. **Prototype-adjacent keys**: `constructor` and `__proto__` are not read from the target;
 *    the `get` trap returns a frozen null-prototype sentinel, `getPrototypeOf` always reports that
 *    sentinel (not the real prototype chain), `has` hides those keys, and `setPrototypeOf` is
 *    rejected—closing the usual `…constructor.constructor` chains.
 *
 * 3. **Identity**: `targetToProxy` is a `WeakMap` from each host object/function to its single
 *    proxy, so repeated reads (e.g. `driver.m === driver.m`) stay stable and cycles do not recurse
 *    forever. `proxyToTarget` reverses the mapping so `Reflect.get`/`apply` can unwrap `this` and
 *    pass the real host receiver to accessors and methods that expect it.
 *
 * 4. **Promises**: A `Proxy` around a native `Promise` breaks V8's internal `then` branding
 *    (WebdriverIO breaks). Host promises are therefore surfaced as a **null-prototype thenable**
 *    that forwards to the real promise and runs `wrapIfNeeded` on fulfilled/rejected values before
 *    VM continuations run. One thenable object per promise lives in `promiseToThenableHost`.
 *
 * 5. **Descriptors**: For **configurable** own properties only, `getOwnPropertyDescriptor` returns
 *    descriptors whose `value` / `get` / `set` are wrapped—so descriptor-based extraction of a
 *    method still yields a sandbox proxy. **Non-configurable** properties must return the real
 *    descriptor unchanged (ECMAScript Proxy invariants); those paths can still expose raw host
 *    callables until the script uses normal property access, which remains wrapped.
 *
 * 6. **`defineProperty`**: Incoming descriptors from the VM may reference our proxies; fields are
 *    unwrapped before `Reflect.defineProperty` so the host object receives real functions/objects.
 *
 * This is defense in depth: Node documents that `vm` is not a full security boundary. Treat
 * `--allow-insecure=…:execute_driver_script` as highly privileged regardless of this module.
 */

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

/**
 * Host `Promise` → null-prototype thenable facade (one per promise; then wrapped by `wrapDeep`).
 * Native promises cannot be proxied without breaking `Promise.prototype.then` receiver checks.
 */
const promiseToThenableHost = new WeakMap<Promise<unknown>, object>();

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

/**
 * @returns Whether `value` is a proxy created by this module (`proxyToTarget` has an entry).
 * Includes both object proxies and function proxies.
 */
function isOurProxy(value: unknown): value is HostTarget {
  return value !== null && (typeof value === 'object' || typeof value === 'function') && proxyToTarget.has(value);
}

/**
 * Maps a value that may be our deep proxy back to the underlying host target for host APIs.
 *
 * @param value - Possibly a proxy from this module, or any other value.
 * @returns The host target if `value` is our proxy; otherwise `value` unchanged.
 */
function unwrapIfProxy<T>(value: T): T {
  if (isOurProxy(value)) {
    return proxyToTarget.get(value) as T;
  }
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
      /* eslint-disable promise/prefer-await-to-then -- thenable facade over a host Promise */
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
                : Promise.reject(wrapIfNeeded(e))
            )
          );
        },
        finally(onFinally?: unknown) {
          return wrapIfNeeded(p.finally(onFinally as () => void | PromiseLike<void> | undefined));
        },
      });
      /* eslint-enable promise/prefer-await-to-then */
      promiseToThenableHost.set(p, o);
      return o;
    })();
  return wrapDeep(hostObj);
}

/**
 * Clones a **configurable** property descriptor so `value` / `get` / `set` are wrapped for the VM.
 *
 * @param d - Descriptor from `Reflect.getOwnPropertyDescriptor` on the host target.
 * @returns A new descriptor safe to return from the proxy `getOwnPropertyDescriptor` trap.
 */
function mapDescriptorForSandbox(descriptor: PropertyDescriptor): PropertyDescriptor {
  if ('value' in descriptor) {
    return {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      writable: descriptor.writable,
      value: wrapIfNeeded(descriptor.value),
    };
  }
  return {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get ? (wrapIfNeeded(descriptor.get) as () => unknown) : undefined,
    set: descriptor.set ? (wrapIfNeeded(descriptor.set) as (v: unknown) => void) : undefined,
  };
}

/**
 * Prepares a property descriptor coming **from** the VM so `Reflect.defineProperty` on the host
 * receives real targets, not our proxy objects.
 *
 * @param descriptor - Descriptor passed into the proxy `defineProperty` trap.
 * @returns Descriptor with `value` / `get` / `set` unwrapped where they were our proxies.
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
 * Unwraps the proxy when used as the `receiver` for `Reflect.get`, so host getters see real `this`.
 */
function reflectReceiver(receiver: unknown): unknown {
  return unwrapIfProxy(receiver);
}

/**
 * Unwraps constructor references passed to `Reflect.construct`.
 *
 * @param newTarget - Constructor received by the proxy `construct` trap.
 * @returns Host constructor with this module's proxy removed when applicable.
 */
function unwrapConstructor(newTarget: HostCallable): HostConstructor {
  return unwrapIfProxy(newTarget) as unknown as HostConstructor;
}

/**
 * Unwraps each argument before forwarding calls into host functions so VM-facing proxies
 * round-trip back to their original host targets.
 *
 * @param argList - Arguments received by the proxy `apply` trap.
 * @returns Arguments with this module's proxies replaced by underlying host targets.
 */
function unwrapArgList(argList: readonly unknown[]): unknown[] {
  return argList.map((arg) => unwrapIfProxy(arg));
}

/**
 * Builds the shared `ProxyHandler` used for every deep wrap (objects and functions).
 *
 * Traps implement the file-level strategy: hide prototype edges, wrap outgoing values, unwrap
 * incoming `this` / descriptors where required by invariants.
 */
function createDeepHandler(): ProxyHandler<HostTarget> {
  return {
    apply(proxyTarget: HostTarget, thisArg: unknown, argArray: unknown[]): unknown {
      const hostFn = proxyTarget as HostCallable;
      const hostThis = unwrapIfProxy(thisArg);
      const hostArgs = unwrapArgList(argArray);
      const result = Reflect.apply(hostFn, hostThis, hostArgs);
      return wrapIfNeeded(result);
    },

    construct(proxyTarget: HostTarget, argArray: unknown[], newTarget: unknown): object {
      const hostCtor = proxyTarget as HostConstructor;
      const hostArgs = unwrapArgList(argArray);
      const hostNewTarget = unwrapConstructor(newTarget as HostCallable);
      const result = Reflect.construct(hostCtor, hostArgs, hostNewTarget);
      return wrapIfNeeded(result) as object;
    },

    defineProperty(
      target: HostTarget,
      prop: string | symbol,
      descriptor: PropertyDescriptor
    ): boolean {
      return Reflect.defineProperty(target, prop, mapDescriptorForHost(descriptor));
    },

    get(target: HostTarget, prop: string | symbol, receiver: unknown): unknown {
      if (isBlockedPrototypeKey(prop)) {
        return SAFE_LOOKUP_TARGET;
      }
      const value = Reflect.get(target, prop, reflectReceiver(receiver));
      return wrapIfNeeded(value);
    },

    getOwnPropertyDescriptor(
      target: HostTarget,
      prop: string | symbol
    ): PropertyDescriptor | undefined {
      if (isBlockedPrototypeKey(prop)) {
        return {
          configurable: true,
          enumerable: false,
          value: SAFE_LOOKUP_TARGET,
          writable: false,
        };
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
      if (!descriptor) {
        return undefined;
      }
      // Non-configurable properties must keep a descriptor compatible with the target
      // (SameValue rules for getters / values); wrapping would violate Proxy invariants.
      if (!descriptor.configurable) {
        return descriptor;
      }
      return mapDescriptorForSandbox(descriptor);
    },

    getPrototypeOf(target: HostTarget): object | null {
      void target;
      return SAFE_LOOKUP_TARGET;
    },

    has(target: HostTarget, prop: string | symbol): boolean {
      if (isBlockedPrototypeKey(prop)) {
        return false;
      }
      return Reflect.has(target, prop);
    },

    setPrototypeOf(target: HostTarget, prototype: object | null): boolean {
      void target;
      void prototype;
      return false;
    },
  };
}

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
  if (isOurProxy(hostValue)) {
    return hostValue as T;
  }
  const cached = targetToProxy.get(hostValue);
  if (cached) {
    return cached as T;
  }
  const handler = createDeepHandler();
  const proxy = new Proxy(hostValue, handler);
  targetToProxy.set(hostValue, proxy);
  proxyToTarget.set(proxy, hostValue);
  return proxy as T;
}

/**
 * Recursively wraps objects and functions; leaves primitives unchanged; routes Promises to the
 * thenable facade.
 *
 * @param value - Result of a `get` / `apply` / descriptor field, or any nested host value.
 * @returns Wrapped proxy, thenable-wrapped promise pipeline, or the original primitive.
 */
function wrapIfNeeded(value: unknown): unknown {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
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
