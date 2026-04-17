import slug from 'slugify';

/**
 * Produces a filesystem-safe slug from a string.
 * @param value Raw value.
 */
export function slugify(value: string) {
  return slug(value);
}
