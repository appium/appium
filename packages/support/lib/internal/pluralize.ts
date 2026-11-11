import pluralizeLib from 'pluralize';

/** Options for pluralize(). */
export interface PluralizeOptions {
  /** If true, prefix the result with the count (e.g. "3 ducks"). */
  inclusive?: boolean;
}

/**
 * Returns the plural or singular form of a word appropriate to the count (e.g. "duck" + 1 → "duck", + 2 → "ducks").
 *
 * @param word - The word to pluralize (or singularize when count is 1)
 * @param count - The count used to choose singular vs plural
 * @param options - Options object or boolean: use `inclusive: true` (or `true`) to prefix with the number (e.g. "3 ducks")
 * @returns The correctly inflected word, optionally prefixed with the count
 */
export function pluralize(word: string, count: number, options: PluralizeOptions | boolean = {}): string {
  let inclusive = false;
  if (typeof options === 'boolean') {
    inclusive = options;
  } else if (typeof options?.inclusive === 'boolean') {
    inclusive = options.inclusive;
  }
  return pluralizeLib(word, count, inclusive);
}
