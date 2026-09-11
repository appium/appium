// @ts-expect-error Internal runtime export is intentionally absent from base-driver declarations.
import {configureAppUrlRules as configureBaseDriverAppUrlRules} from '@appium/base-driver';

import type {AppiumDriver} from './appium.js';

/** @internal */
export function configureAppUrlRules(this: AppiumDriver): void {
  configureBaseDriverAppUrlRules.call(this, this.args.appUrlRules);
}
