/**
 * Package-internal utilities. Not exported from `@appium/support`.
 */
export {createBase64EncodeStream} from './base64-encode-stream';
export {
  type NormalizedPackageJson,
  type NormalizeOptions,
  packageDirectorySync,
  type PackageJson,
  readPackage,
  type ReadPackageOptions,
  readPackageSync,
} from './read-package';
