import {FakeDriver} from '../driver';

/**
 * This function assigns a mixin `T` to the `FakeDriver` class' prototype.
 * While each mixin has its own interface which is (in isolation) unrelated to `FakeDriver`, the constraint
 * on this generic type `T` is that it must be a partial of `FakeDriver`'s interface. This enforces
 * that it does not conflict with the existing interface of `FakeDriver`.  In that way, you can
 * think of it as a type guard.
 * @param mixin Mixin implementation
 */
export function mixin<T extends Partial<FakeDriver>>(mixin: T): void {
  Object.assign(FakeDriver.prototype, mixin);
}
