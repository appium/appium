import {node, fs, util} from '@appium/support';

export const npmPackage = fs.readPackageJsonFrom(__dirname);

/**
 * Returns the root directory of the Appium module (memoized).
 *
 * @throws {Error} If the appium module root cannot be determined.
 */
export const getAppiumModuleRoot = util.memoize(function getAppiumModuleRoot(): string {
  const selfRoot = node.getModuleRootSync('appium', __filename);
  if (!selfRoot) {
    throw new Error('Cannot find the appium module root. This is likely a bug in Appium.');
  }
  return selfRoot;
});
