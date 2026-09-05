import type {InstallType} from 'appium/types/index.js';

/**
 * "npm" install type
 * Used when extension was installed by npm package name
 * @remarks _All_ extensions are installed _by_ `npm`, but only this one means the package name was
 * used to specify it
 */
export const INSTALL_TYPE_NPM = 'npm';
/**
 * "local" install type
 * Used when extension was installed from a local path
 */
export const INSTALL_TYPE_LOCAL = 'local';
/**
 * "github" install type
 * Used when extension was installed via GitHub URL
 */
export const INSTALL_TYPE_GITHUB = 'github';
/**
 * "git" install type
 * Used when extensions was installed via Git URL
 */
export const INSTALL_TYPE_GIT = 'git';
/**
 * "dev" install type
 * Used when automatically detected as a working copy
 */
export const INSTALL_TYPE_DEV = 'dev';

export const INSTALL_TYPES = new Set<InstallType>([
  INSTALL_TYPE_GIT,
  INSTALL_TYPE_GITHUB,
  INSTALL_TYPE_LOCAL,
  INSTALL_TYPE_NPM,
  INSTALL_TYPE_DEV,
]);
