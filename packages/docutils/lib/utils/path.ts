import path from 'node:path';

/**
 * Computes a relative path, prepending `./`
 */
export function relative(from: string): (to: string) => string;
export function relative(from: string, to: string): string;
export function relative(from: string, to?: string): string | ((to: string) => string) {
  if (to === undefined) {
    return (nextTo: string) => `.${path.sep}${path.relative(from, nextTo)}`;
  }
  return `.${path.sep}${path.relative(from, to)}`;
}
