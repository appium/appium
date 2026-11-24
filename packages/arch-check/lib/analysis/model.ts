import {execFile} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import picomatch from 'picomatch';

import type {ArchitectureModel} from '../types.js';

const execFileAsync = promisify(execFile);

/** Components tagged with this are documented but not checked. */
export const UNENFORCED_TAG = 'unenforced';

export interface Ownership {
  /** Ids of the enforced components (those that are not `#unenforced`). */
  componentIds: Set<string>;
  /** Ids of all components (enforced or not) whose paths match `file` (package-relative, `/`-separated). */
  ownersOf: (file: string) => string[];
}

/** Exports the LikeC4 model in `modelDir` to JSON using the bundled `likec4` CLI. */
export async function exportModel(modelDir: string): Promise<ArchitectureModel> {
  const tmp = await mkdtemp(path.join(tmpdir(), 'arch-check-'));
  try {
    const out = path.join(tmp, 'model.json');
    await execFileAsync(process.execPath, [await findLikec4Bin(), 'export', 'json', modelDir, '-o', out]);
    return parseModel(JSON.parse(await readFile(out, 'utf8')));
  } catch (err) {
    const stderr = (err as {stderr?: string}).stderr?.trim();
    throw new Error(`Cannot export the architecture model in ${modelDir}: ${stderr || (err as Error).message}`, {
      cause: err,
    });
  } finally {
    await rm(tmp, {recursive: true, force: true});
  }
}

/** Checks that the JSON exported by `likec4` has the shape this tool reads. */
export function parseModel(json: unknown): ArchitectureModel {
  const model = json as Partial<ArchitectureModel> | null;
  if (!model || typeof model.elements !== 'object' || typeof model.relations !== 'object') {
    throw new Error("unexpected `likec4 export json` format: expected 'elements' and 'relations' objects");
  }
  return model as ArchitectureModel;
}

/** Maps source files to the components that own them (via `metadata.paths` globs). */
export function buildOwnership(model: ArchitectureModel): Ownership {
  const components = Object.values(model.elements).filter((e) => e.kind === 'component' && e.metadata?.paths);
  const matchers = components.map((c) => ({
    id: c.id,
    isMatch: picomatch([c.metadata?.paths ?? []].flat(), {dot: true}),
  }));
  return {
    componentIds: new Set(components.filter((c) => !c.tags?.includes(UNENFORCED_TAG)).map((c) => c.id)),
    ownersOf: (file) => matchers.filter((m) => m.isMatch(file)).map((m) => m.id),
  };
}

/** The component -> component edges the model allows, as `from -> to` keys. */
export function allowedEdges(model: ArchitectureModel, componentIds: ReadonlySet<string>): Set<string> {
  const edges = new Set<string>();
  for (const {source, target} of Object.values(model.relations)) {
    if (componentIds.has(source.model) && componentIds.has(target.model)) {
      edges.add(`${source.model} -> ${target.model}`);
    }
  }
  return edges;
}

/** Locates the `likec4` CLI script, without relying on its `exports` map. */
async function findLikec4Bin(): Promise<string> {
  const dir = findPackageDir('likec4');
  const {bin} = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as {
    bin?: string | Record<string, string>;
  };
  const rel = typeof bin === 'string' ? bin : bin?.likec4;
  if (!rel) {
    throw new Error(`the 'likec4' package at ${dir} declares no 'likec4' executable`);
  }
  return path.resolve(dir, rel);
}

/** Walks up from the package's resolved entry point to its root directory. */
function findPackageDir(name: string): string {
  let dir = path.dirname(fileURLToPath(import.meta.resolve(name)));
  while (
    !existsSync(path.join(dir, 'package.json')) ||
    JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).name !== name
  ) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`cannot locate the '${name}' package`);
    }
    dir = parent;
  }
  return dir;
}
