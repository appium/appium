import {Constraints} from '@appium/types';
import {BaseDriver} from '../driver';

/**
 * This function assigns a mixin `T` to the `BaseDriver` class' prototype.
 * While each mixin has its own interface which is (in isolation) unrelated to `BaseDriver`, the constraint
 * on this generic type `T` is that it must be a partial of `BaseDriver`'s interface. This enforces
 * that it does not conflict with the existing interface of `BaseDriver`.  In that way, you can
 * think of it as a type guard.
 * @param mixin Mixin implementation
 */
export function mixin<C extends Constraints, T extends Partial<BaseDriver<C>>>(mixin: T): void {
  // eslint-disable-next-line no-restricted-syntax
  Object.assign(BaseDriver.prototype, mixin);
}
