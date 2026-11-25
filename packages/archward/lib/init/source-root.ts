import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

/** Directories that usually hold a package's source, in order of preference. */
const SOURCE_ROOT_CANDIDATES = ['lib', 'src'];

/**
 * Picks `lib` or `src`. A directory that holds build output is skipped: the tsconfig `outDir`, or,
 * when both exist, the one the `main` entry points into.
 */
export async function detectSourceRoot(root: string): Promise<string> {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {main?: string};
  const tsconfig = await readFile(path.join(root, 'tsconfig.json'), 'utf8').catch(() => '');
  const outDir = /"outDir"\s*:\s*"(?:\.\/)?([^"/]+)\/?"/.exec(tsconfig)?.[1];
  const main = pkg.main?.replace(/^\.\//, '');
  let candidates = SOURCE_ROOT_CANDIDATES.filter((dir) => existsSync(path.join(root, dir)) && dir !== outDir);
  if (candidates.length > 1) {
    const rest = candidates.filter((dir) => !main?.startsWith(`${dir}/`));
    candidates = rest.length ? rest : candidates;
  }
  if (!candidates.length) {
    throw new Error(`Cannot tell where the source is in ${root}; pass it with --source-root`);
  }
  return candidates[0];
}
