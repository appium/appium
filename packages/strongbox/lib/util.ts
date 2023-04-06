import path from 'node:path';
import slug from 'slugify';

export function slugify(value: string) {
  return slug(value, {lower: true});
}

export function slugifyPath(filepath: string) {
  return filepath.split(path.sep).map(slugify).join(path.sep);
}
