import assert from 'node:assert/strict';
import nodeFs from 'node:fs';
import path from 'node:path';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import ts from 'typescript';

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../lib');
const INTERNAL = path.join(LIB, 'internal');
const BARREL = path.join(INTERNAL, 'index.ts');

interface Edge {
  from: string;
  to: string;
  /** Erased at runtime, so it cannot take part in a cycle */
  typeOnly: boolean;
}

function listSources(dir: string): string[] {
  return nodeFs.readdirSync(dir, {withFileTypes: true}).flatMap((item) => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      return listSources(full);
    }
    return full.endsWith('.ts') && !full.endsWith('.d.ts') ? [full] : [];
  });
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  const named = clause?.namedBindings;
  return (
    Boolean(clause?.isTypeOnly) ||
    (!clause?.name && !!named && ts.isNamedImports(named) && named.elements.every((e) => e.isTypeOnly))
  );
}

function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
  const named = node.exportClause;
  return node.isTypeOnly || (!!named && ts.isNamedExports(named) && named.elements.every((e) => e.isTypeOnly));
}

function readEdges(file: string): Edge[] {
  const source = ts.createSourceFile(file, nodeFs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const edges: Edge[] = [];
  for (const node of source.statements) {
    if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) || !node.moduleSpecifier) {
      continue;
    }
    const spec = (node.moduleSpecifier as ts.StringLiteral).text;
    if (!spec.startsWith('.')) {
      continue;
    }
    const typeOnly = ts.isImportDeclaration(node) ? isTypeOnlyImport(node) : isTypeOnlyExport(node);
    edges.push({from: file, to: path.resolve(path.dirname(file), spec.replace(/\.js$/, '.ts')), typeOnly});
  }
  return edges;
}

const isInternal = (file: string) => file.startsWith(`${INTERNAL}${path.sep}`);
const rel = (file: string) => path.relative(LIB, file);

describe('internal modules layering', function () {
  const files = listSources(LIB);
  const edges = files.flatMap(readEdges);

  it('should resolve every relative import to a source file', function () {
    for (const {from, to} of edges) {
      assert.ok(files.includes(to), `${rel(from)} imports a missing module ${to}`);
    }
  });

  it('should only be reached from the rest of the package through the barrel', function () {
    const bypassing = edges.filter(({from, to}) => !isInternal(from) && isInternal(to) && to !== BARREL);
    assert.deepEqual(
      bypassing.map(({from, to}) => `${rel(from)} -> ${rel(to)}`),
      [],
    );
  });

  it('should not import anything from outside of itself', function () {
    const upward = edges.filter(({from, to}) => isInternal(from) && !isInternal(to));
    assert.deepEqual(
      upward.map(({from, to}) => `${rel(from)} -> ${rel(to)}`),
      [],
    );
  });

  it('should not import the barrel from inside', function () {
    const selfImports = edges.filter(({from, to}) => isInternal(from) && to === BARREL);
    assert.deepEqual(
      selfImports.map(({from}) => rel(from)),
      [],
    );
  });

  it('should not have import cycles', function () {
    const graph = new Map<string, string[]>(files.map((file) => [file, []]));
    for (const {from, to, typeOnly} of edges) {
      if (!typeOnly) {
        graph.get(from)?.push(to);
      }
    }
    // A module is on a cycle if it can reach itself
    const reaches = (start: string): boolean => {
      const seen = new Set<string>();
      const stack = [...(graph.get(start) ?? [])];
      while (stack.length) {
        const current = stack.pop() as string;
        if (current === start) {
          return true;
        }
        if (!seen.has(current)) {
          seen.add(current);
          stack.push(...(graph.get(current) ?? []));
        }
      }
      return false;
    };
    const cyclic = files.filter((file) => reaches(file));
    assert.deepEqual(cyclic.map(rel), []);
  });
});
