import {fs} from '@appium/support';
import crypto from 'node:crypto';
import path from 'node:path';

export interface IsPackageChangedOptions {
  cwd?: string;
  hashFilename?: string;
}

export interface IsPackageChangedResult {
  hash: string;
  isChanged: boolean;
  oldHash?: string;
  writeHash: () => Promise<void>;
}

/**
 * Detects whether `package.json` dependencies changed since the last hash write.
 * Inlined from the `package-changed` package (lockfile support omitted; unused by Appium).
 */
export async function isPackageChanged(
  options: IsPackageChangedOptions = {},
): Promise<IsPackageChangedResult> {
  const {hashFilename = '.packagehash', cwd = process.cwd()} = options;
  const packagePath = await findPackageJson(cwd);
  if (!packagePath) {
    throw new Error('Cannot find package.json. Travelling up from current working directory.');
  }

  const packageHashPath = path.join(cwd, hashFilename);
  const packageHashPathExists = await fs.exists(packageHashPath);
  const recentDigest = await getPackageHash(packagePath);
  const previousDigest = packageHashPathExists
    ? await fs.readFile(packageHashPath, 'utf-8')
    : undefined;
  const isChanged = !packageHashPathExists || previousDigest !== recentDigest;

  const writeHash = async () => {
    await fs.writeFile(packageHashPath, recentDigest, 'utf-8');
  };

  return {
    hash: recentDigest,
    isChanged,
    oldHash: previousDigest || undefined,
    writeHash,
  };
}

async function findPackageJson(cwd: string): Promise<string | undefined> {
  let current = cwd;
  while (true) {
    const search = path.join(current, 'package.json');
    if (await fs.exists(search)) {
      return search;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }
    current = parent;
  }
}

async function getPackageHash(packagePath: string): Promise<string> {
  const contents = await fs.readFile(packagePath, 'utf-8');
  const packageBlob = JSON.parse(contents) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies = {
    dependencies: packageBlob.dependencies ?? {},
    devDependencies: packageBlob.devDependencies ?? {},
  };
  const hashSum = crypto.createHash('md5');
  hashSum.update(Buffer.from(JSON.stringify(dependencies)));
  return hashSum.digest('hex');
}
