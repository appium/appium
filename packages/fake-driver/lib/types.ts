import type {DriverCaps, W3CDriverCaps} from '@appium/types';
import type {FakeDriverConstraints} from './desired-caps';

/**
 * W3C-style caps for {@link FakeDriver}
 * @public
 */
export type W3CFakeDriverCaps = W3CDriverCaps<FakeDriverConstraints>;

/**
 * Capabilities for {@link FakeDriver}
 * @public
 */
export type FakeDriverCaps = DriverCaps<FakeDriverConstraints>;
