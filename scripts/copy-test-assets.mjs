import {cp, mkdir, readdir} from 'node:fs/promises';
import path from 'node:path';

const PACKAGES_DIR = path.resolve('packages');
const IGNORED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.map',
]);

async function copyAssetsForPackage(packageDir) {
  const testDir = path.join(packageDir, 'test');
  const buildTestDir = path.join(packageDir, 'build', 'test');

  async function copyRecursive(srcDir, relativeDir = '') {
    let entries;
    try {
      entries = await readdir(srcDir, {withFileTypes: true});
    } catch (err) {
      if (err?.code === 'ENOENT') {
        return;
      }
      throw err;
    }

    for (const entry of entries) {
      const src = path.join(srcDir, entry.name);
      const relativePath = path.join(relativeDir, entry.name);
      const dest = path.join(buildTestDir, relativePath);

      if (entry.isDirectory()) {
        await copyRecursive(src, relativePath);
      } else if (!IGNORED_EXTENSIONS.has(path.extname(entry.name))) {
        await mkdir(path.dirname(dest), {recursive: true});
        await cp(src, dest);
      }
    }
  }

  await copyRecursive(testDir);
}

const packages = await readdir(PACKAGES_DIR, {withFileTypes: true});
for (const entry of packages) {
  if (entry.isDirectory()) {
    await copyAssetsForPackage(path.join(PACKAGES_DIR, entry.name));
  }
}
