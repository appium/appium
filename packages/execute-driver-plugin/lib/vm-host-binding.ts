/**
 * Null-prototype object returned for prototype-adjacent property lookups on
 * proxied host values. It must not inherit `Object.prototype` (which would
 * reintroduce `constructor` / `__proto__` chains back to the host `Function`).
 */
const SAFE_LOOKUP_TARGET: object = Object.freeze(Object.create(null));

/**
 * Wraps a host-realm object or function before passing it to `vm.runInNewContext`.
 *
 * Values originating in the Node child process still carry main-realm prototype
 * metadata. Untrusted script inside the VM can otherwise obtain the host
 * `Function` (for example via `value.constructor.constructor`,
 * `Object.getPrototypeOf(value).constructor.constructor`, or the same pattern on
 * injected `setTimeout` / `console.log`) and escape the VM sandbox, yielding
 * arbitrary code execution on the Appium server host.
 *
 * @param hostValue - Any host object or function placed on the VM context global
 * @returns Proxied value safe to expose as a `vm` context global
 */
export function wrapHostBindingForVmContext<T extends object | Function>(hostValue: T): T {
  return new Proxy(hostValue, {
    get(target, prop, receiver) {
      if (prop === 'constructor' || prop === '__proto__') {
        return SAFE_LOOKUP_TARGET;
      }
      return Reflect.get(target, prop, receiver);
    },
    getPrototypeOf() {
      return SAFE_LOOKUP_TARGET;
    },
    setPrototypeOf() {
      return false;
    },
  }) as T;
}
