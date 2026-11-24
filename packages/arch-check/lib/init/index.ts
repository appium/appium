import {existsSync} from 'node:fs';
import {mkdir, readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {cruiseSources} from '../analysis/graph.js';
import {exportModel} from '../analysis/model.js';
import {updateBaseline} from '../check.js';
import {ARCHITECTURE_DIR, normalizeSourceRoot} from '../config.js';
import type {ArchCheckConfig, ResolvedConfig} from '../types.js';
import {deriveComponents, deriveEdges} from './derive.js';
import {renderModel} from './render.js';
import {detectSourceRoot} from './source-root.js';

export interface InitOptions {
  /** Source directory, relative to the package. Default: `lib`, or `src` if there is no `lib`. */
  sourceRoot?: string;
  entryPointScopes?: string[];
}

export interface InitResult {
  files: string[];
  components: number;
  edges: number;
}

/**
 * Scaffolds `architecture/` for the package in `packageDir` from its current code: one component
 * per top-level directory or root file of the source root, and the dependencies that exist today.
 * Review the result and delete the dependencies that should not be allowed; then run
 * `updateBaseline` to tolerate the violations.
 */
export async function initPackage(packageDir: string, options: InitOptions = {}): Promise<InitResult> {
  const root = await realpath(path.resolve(packageDir));
  const modelDir = path.join(root, ARCHITECTURE_DIR);
  const existing = await readdir(modelDir).catch(() => [] as string[]);
  if (existing.some((f) => f.endsWith('.c4'))) {
    throw new Error(`${modelDir} already contains a model`);
  }
  const sourceRoot = normalizeSourceRoot(options.sourceRoot ?? (await detectSourceRoot(root)), '--source-root');
  if (!existsSync(path.join(root, sourceRoot))) {
    throw new Error(`No '${sourceRoot}' directory in ${root}; pass the source directory with --source-root`);
  }
  const config: ResolvedConfig = {
    packageDir: root,
    sourceRoot,
    tsconfig: 'tsconfig.json',
    entryPointScopes: options.entryPointScopes ?? [],
    typeOnlyCycles: 'error',
    undeclaredDependencies: 'ignore',
    modelDir,
    baselineFile: path.join(modelDir, 'baseline.json'),
  };
  const prefix = `${sourceRoot.replace(/\/$/, '')}/`;
  const graph = await cruiseSources(config, true);
  const sources = graph.modules.filter((m) => m.source.startsWith(prefix));
  const components = deriveComponents(
    sources.map((m) => m.source),
    sourceRoot,
  );
  const edges = deriveEdges(
    sources.flatMap((m) =>
      m.dependencies.filter((d) => d.resolved.startsWith(prefix)).map((d) => [m.source, d.resolved]),
    ),
    components,
  );
  const pkgName = (JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {name?: string}).name;
  const rendered = renderModel(pkgName ?? path.basename(root), components, edges);

  const userConfig: ArchCheckConfig = {
    ...(sourceRoot === 'lib' ? {} : {sourceRoot}),
    ...(options.entryPointScopes?.length ? {entryPointScopes: options.entryPointScopes} : {}),
  };
  const written = [
    ['spec.c4', rendered.spec],
    ['model.c4', rendered.model],
    ...(Object.keys(userConfig).length ? [['config.json', `${JSON.stringify(userConfig, null, 2)}\n`]] : []),
  ];
  await mkdir(modelDir, {recursive: true});
  await Promise.all(written.map(([name, content]) => writeFile(path.join(modelDir, name), content)));
  // Fail now if a generated name is not valid LikeC4, rather than on the first check.
  await exportModel(modelDir);
  await updateBaseline(root);
  return {
    files: [...written.map(([name]) => `${ARCHITECTURE_DIR}/${name}`), `${ARCHITECTURE_DIR}/baseline.json`],
    components: components.length,
    edges: edges.length,
  };
}
