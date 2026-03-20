import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.resolve(__dirname, '../packages');
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/**
 * Ensures internal @appium/* deps in workspace packages use "~" ranges
 * after release/version tooling updates.
 */
function normalizeDepField(dependencies = {}) {
  let changed = false;
  for (const [name, range] of Object.entries(dependencies)) {
    if (!name.startsWith('@appium/')) {
      continue;
    }
    if (typeof range !== 'string' || !range.startsWith('^')) {
      continue;
    }
    dependencies[name] = `~${range.slice(1)}`;
    changed = true;
  }
  return changed;
}

async function getWorkspacePackageJsonPaths() {
  const entries = await fs.readdir(packagesDir, {withFileTypes: true});
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name, 'package.json'));
}

async function main() {
  const packageJsonPaths = await getWorkspacePackageJsonPaths();

  await Promise.all(
    packageJsonPaths.map(async (packageJsonPath) => {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      let changed = false;

      for (const depField of DEP_FIELDS) {
        changed = normalizeDepField(packageJson[depField]) || changed;
      }

      if (!changed) {
        return;
      }

      await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
    })
  );
}

await main();
