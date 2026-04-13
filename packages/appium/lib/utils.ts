import _ from 'lodash';
import {node, fs} from '@appium/support';

export const npmPackage = fs.readPackageJsonFrom(__dirname);

/**
 * Returns the root directory of the Appium module (memoized).
 *
 * @throws {Error} If the appium module root cannot be determined.
 */
export const getAppiumModuleRoot = _.memoize(function getAppiumModuleRoot(): string {
  const selfRoot = node.getModuleRootSync('appium', __filename);
  if (!selfRoot) {
    throw new Error('Cannot find the appium module root. This is likely a bug in Appium.');
  }
  return selfRoot;
});

/**
 * Adler-32 checksum (see https://github.com/SheetJS/js-adler32).
 */
export function adler32(str: string, seed: number | null = null): number {
  let a = 1,
    b = 0,
    M = 0,
    c = 0,
    d = 0;
  const L = str.length;
  if (typeof seed === 'number') {
    a = seed & 0xffff;
    b = seed >>> 16;
  }
  for (let i = 0; i < L;) {
    M = Math.min(L - i, 2918);
    while (M > 0) {
      c = str.charCodeAt(i++);
      if (c < 0x80) {
        a += c;
      } else if (c < 0x800) {
        a += 192 | ((c >> 6) & 31);
        b += a;
        --M;
        a += 128 | (c & 63);
      } else if (c >= 0xd800 && c < 0xe000) {
        c = (c & 1023) + 64;
        d = str.charCodeAt(i++) & 1023;
        a += 240 | ((c >> 8) & 7);
        b += a;
        --M;
        a += 128 | ((c >> 2) & 63);
        b += a;
        --M;
        a += 128 | ((d >> 6) & 15) | ((c & 3) << 4);
        b += a;
        --M;
        a += 128 | (d & 63);
      } else {
        a += 224 | ((c >> 12) & 15);
        b += a;
        --M;
        a += 128 | ((c >> 6) & 63);
        b += a;
        --M;
        a += 128 | (c & 63);
      }
      b += a;
      --M;
    }
    a = 15 * (a >>> 16) + (a & 65535);
    b = 15 * (b >>> 16) + (b & 65535);
  }
  return ((b % 65521) << 16) | (a % 65521);
}
