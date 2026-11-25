import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {findWorkspacePackages} from '../../lib/workspaces.js';

describe('findWorkspacePackages', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'archward-ws-'));
  });

  afterEach(async () => {
    await rm(root, {recursive: true, force: true});
  });

  async function pkg(dir: string, model = true) {
    await mkdir(path.join(root, dir, model ? 'architecture' : ''), {recursive: true});
    if (model) {
      await writeFile(path.join(root, dir, 'architecture/model.c4'), 'model {}\n');
    }
  }

  it('lists workspace packages that have a model', async () => {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({workspaces: ['packages/*', '!packages/skip']}));
    await pkg('packages/a');
    await pkg('packages/b', false);
    await pkg('packages/skip');
    await pkg('other');
    assert.deepEqual(await findWorkspacePackages(root), [path.join(root, 'packages/a')]);
  });

  it('supports the object form and nested patterns', async () => {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({workspaces: {packages: ['apps/*/web']}}));
    await pkg('apps/x/web');
    assert.deepEqual(await findWorkspacePackages(root), [path.join(root, 'apps/x/web')]);
  });

  it('rejects roots without workspaces and unsupported patterns', async () => {
    await writeFile(path.join(root, 'package.json'), '{}');
    await assert.rejects(findWorkspacePackages(root), /declares no workspaces/);
    await writeFile(path.join(root, 'package.json'), JSON.stringify({workspaces: ['packages/**']}));
    await assert.rejects(findWorkspacePackages(root), /only '\*' wildcards/);
  });
});
