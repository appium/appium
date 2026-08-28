import type {Constraints} from '@appium/types';

import type {BaseDriver} from '../driver.js';

/**
 * Assigns a mixin `T` to the given `BaseDriver` prototype.
 * While each mixin has its own interface which is (in isolation) unrelated to `BaseDriver`, the constraint
 * on this generic type `T` is that it must be a partial of `BaseDriver`'s interface. This enforces
 * that it does not conflict with the existing interface of `BaseDriver`. In that way, you can
 * think of it as a type guard.
 *
 * Takes the prototype as a parameter, rather than importing `BaseDriver` as a value, so that command
 * modules (which this function's callers live in) don't hold a circular runtime reference back to
 * `driver.ts` — under ESM, that circularity would read `BaseDriver` while it's still in its temporal
 * dead zone, since `driver.ts` imports the command modules to apply their mixins.
 * @param prototype `BaseDriver.prototype`
 * @param mixin Mixin implementation
 */
export function mixin<C extends Constraints, T extends Partial<BaseDriver<C>>>(
  prototype: object,
  mixin: T,
): void {
  Object.assign(prototype, mixin);
}
