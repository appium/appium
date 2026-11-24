import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';

import {globToRegExp} from './rules.js';
import type {ArchitectureModel} from './types.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

/** Components tagged with this are documented but not checked. */
export const UNENFORCED_TAG = 'unenforced';

export interface Ownership {
  componentIds: Set<string>;
  /** Id of the component owning `file` (package-relative, `/`-separated), if any. */
  ownerOf: (file: string) => string | undefined;
}

/** Exports the LikeC4 model in `modelDir` to JSON using the bundled `likec4` CLI. */
export async function exportModel(modelDir: string): Promise<ArchitectureModel> {
  const tmp = await mkdtemp(path.join(tmpdir(), 'arch-check-'));
  try {
    const pkgFile = require.resolve('likec4/package.json');
    const {bin} = JSON.parse(await readFile(pkgFile, 'utf8')) as {bin: {likec4: string}};
    const out = path.join(tmp, 'model.json');
    await execFileAsync(process.execPath, [
      path.resolve(path.dirname(pkgFile), bin.likec4),
      'export',
      'json',
      modelDir,
      '-o',
      out,
    ]);
    return JSON.parse(await readFile(out, 'utf8')) as ArchitectureModel;
  } catch (err) {
    const stderr = (err as {stderr?: string}).stderr?.trim();
    throw new Error(`Cannot export the architecture model in ${modelDir}: ${stderr || (err as Error).message}`, {
      cause: err,
    });
  } finally {
    await rm(tmp, {recursive: true, force: true});
  }
}

/** Maps source files to the checked components that own them (via `metadata.paths` globs). */
export function buildOwnership(model: ArchitectureModel): Ownership {
  const components = Object.values(model.elements).filter(
    (e) => e.kind === 'component' && e.metadata?.paths && !e.tags?.includes(UNENFORCED_TAG),
  );
  const matchers = components.flatMap((c) =>
    [c.metadata?.paths ?? []].flat().map((glob) => ({id: c.id, re: globToRegExp(glob)})),
  );
  return {
    componentIds: new Set(components.map((c) => c.id)),
    ownerOf: (file) => matchers.find((m) => m.re.test(file))?.id,
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
