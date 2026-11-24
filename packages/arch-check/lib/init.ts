import {existsSync} from 'node:fs';
import {mkdir, readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {updateBaseline} from './check.js';
import {ARCHITECTURE_DIR} from './config.js';
import {cruiseSources} from './graph.js';
import {exportModel} from './model.js';
import {byString} from './rules.js';
import type {ArchCheckConfig, ResolvedConfig} from './types.js';

/** Directories that usually hold a package's source, in order of preference. */
const SOURCE_ROOT_CANDIDATES = ['lib', 'src'];

/** Words LikeC4 does not accept as element names. */
const RESERVED = new Set(
  `views specification global dynamic extend import include exclude with from to view of style tag kind
  color icon title description technology metadata link this it self extends where and or not is true false
  navigateTo shape border opacity size autoLayout rank`.split(/\s+/),
);

export interface InitOptions {
  /** Source directory, relative to the package. Default: `lib`, or `src` if there is no `lib`. */
  sourceRoot?: string;
  entryPointScopes?: string[];
}

export interface DerivedComponent {
  id: string;
  title: string;
  /** Glob of the files the component owns, relative to the package. */
  paths: string;
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
  const sourceRoot = options.sourceRoot ?? (await detectSourceRoot(root));
  if (!existsSync(path.join(root, sourceRoot))) {
    throw new Error(`No '${sourceRoot}' directory in ${root}; pass the source directory with --source-root`);
  }
  const config: ResolvedConfig = {
    packageDir: root,
    sourceRoot,
    tsconfig: 'tsconfig.json',
    entryPointScopes: options.entryPointScopes ?? [],
    typeOnlyCycles: 'error',
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

/**
 * One component per top-level directory of the source root, and one per file directly in it.
 * @param files - package-relative paths of the source files
 */
export function deriveComponents(files: readonly string[], sourceRoot: string): DerivedComponent[] {
  const prefix = `${sourceRoot.replace(/\/$/, '')}/`;
  const dirs = new Set<string>();
  const rootFiles = new Set<string>();
  for (const file of files) {
    const rel = file.slice(prefix.length);
    const slash = rel.indexOf('/');
    if (slash === -1) {
      rootFiles.add(rel);
    } else {
      dirs.add(rel.slice(0, slash));
    }
  }
  const used = new Set<string>();
  const uniqueId = (name: string): string => {
    const base = toIdentifier(name);
    let id = base;
    for (let n = 2; used.has(id); n++) {
      id = `${base}_${n}`;
    }
    used.add(id);
    return id;
  };
  return [
    ...[...dirs].sort(byString).map((dir) => ({
      id: uniqueId(dir),
      title: dir,
      paths: `${prefix}${dir}/**`,
    })),
    ...[...rootFiles].sort(byString).map((file) => ({
      id: uniqueId(dirs.has(path.parse(file).name) ? `${path.parse(file).name}_file` : path.parse(file).name),
      title: file,
      paths: `${prefix}${file}`,
    })),
  ];
}

/**
 * The dependencies between components that exist in the code.
 * @param imports - `[from, to]` pairs of package-relative file paths
 */
export function deriveEdges(
  imports: readonly (readonly string[])[],
  components: readonly DerivedComponent[],
): string[] {
  const owners = components.map((c) => ({id: c.id, isMatch: globMatcher(c.paths)}));
  const ownerOf = (file: string) => owners.find((o) => o.isMatch(file))?.id;
  const edges = new Set<string>();
  for (const [from, to] of imports) {
    const [a, b] = [ownerOf(from), ownerOf(to)];
    if (a && b && a !== b) {
      edges.add(`${a} -> ${b}`);
    }
  }
  return [...edges].sort(byString);
}

/** Renders `spec.c4` and `model.c4`. */
export function renderModel(
  packageName: string,
  components: readonly DerivedComponent[],
  edges: readonly string[],
): {spec: string; model: string} {
  const container = toIdentifier(packageName.replace(/^@/, '').replace(/\//g, '-'));
  const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const spec = `specification {
  element container
  element component
  // Tag a component #unenforced to document it without checking its dependencies.
  tag unenforced
}
`;
  const model = `// Architecture of ${packageName}, derived from the code by \`arch-check init\`.
// Each component owns the files in \`metadata.paths\`; each \`a -> b\` below ALLOWS a to import b.
// Delete the dependencies you do not want (arch-check then reports them), and add descriptions.
model {
  ${container} = container ${quote(packageName)} {
${components
  .map(
    (c) => `    ${c.id} = component ${quote(c.title)} {
      description 'TODO: describe the responsibility of ${c.title.replace(/'/g, '')}'
      metadata { paths ${quote(c.paths)} }
    }`,
  )
  .join('\n')}
  }

${edges
  .map((e) => {
    const [from, to] = e.split(' -> ');
    return `  ${container}.${from} -> ${container}.${to}`;
  })
  .join('\n')}
}
`;
  return {spec, model};
}

function toIdentifier(name: string): string {
  const id = name.replace(/[^A-Za-z0-9_-]/g, '_').replace(/^[^A-Za-z]/, (c) => `c${c}`);
  return RESERVED.has(id) ? `${id}_` : id;
}

function globMatcher(glob: string): (file: string) => boolean {
  return glob.endsWith('/**') ? (file) => file.startsWith(glob.slice(0, -2)) : (file) => file === glob;
}

/** Picks `lib` or `src`, skipping a directory that holds build output (tsconfig `outDir` or the `main` entry). */
async function detectSourceRoot(root: string): Promise<string> {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {main?: string};
  const tsconfig = await readFile(path.join(root, 'tsconfig.json'), 'utf8').catch(() => '');
  const outDir = /"outDir"\s*:\s*"(?:\.\/)?([^"/]+)\/?"/.exec(tsconfig)?.[1];
  const main = pkg.main?.replace(/^\.\//, '');
  const isOutput = (dir: string) => dir === outDir || Boolean(main?.startsWith(`${dir}/`));
  const found = SOURCE_ROOT_CANDIDATES.find((dir) => existsSync(path.join(root, dir)) && !isOutput(dir));
  if (!found) {
    throw new Error(`Cannot tell where the source is in ${root}; pass it with --source-root`);
  }
  return found;
}
