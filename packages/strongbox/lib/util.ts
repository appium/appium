import slug from 'slugify';

export function slugify(value: string) {
  return slug(value);
}
