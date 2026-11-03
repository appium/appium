/**
 * Converts an object of string values to an array of arguments for CLI
 *
 * Supports `boolean` and `number` values as well.  `boolean`s are assumed to be flags which default
 * to `false`, so they will only be added to the array if the value is `true`.
 */
export const argify = (obj: Record<string, string | number | boolean | undefined>): string[] => {
  const args: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === true) {
      args.push(`--${key}`);
    } else if (value === false || value === undefined) {
      continue;
    } else {
      args.push(`--${key}`, String(value));
    }
  }
  return args;
};

/**
 * Converts a string to kebab-case.
 * @param value Input string
 * @returns Kebab-cased string
 */
export function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}
