import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {fs, system, tempDir} from '@appium/support';

import {npm} from '../../lib/utils/npm.js';

describe('npm argument boundaries', function () {
  for (const name of ['driver with spaces', 'driver & %TEMP% 日本語']) {
    it(`reads a local package under ${name}`, async function () {
      const root = await tempDir.openDir();
      try {
        const prefix = path.join(root, name);
        await fs.mkdir(prefix);
        await fs.writeFile(path.join(prefix, 'package.json'), JSON.stringify({name: 'argument-probe'}));

        // This reads only local metadata; it neither installs packages nor accesses the registry.
        const result = await npm.exec('pkg', ['get', 'name', '--prefix', prefix], {cwd: root, json: true});

        assert.equal(result.json, 'argument-probe');
        assert.equal(result.code, 0);
      } finally {
        await fs.rimraf(root);
      }
    });
  }

  it('preserves arguments when the Windows shim selects a global npm', {skip: !system.isWindows()}, async function (t) {
    const root = await tempDir.openDir();
    try {
      const shim = path.join(root, 'npm.cmd');
      const npmBin = path.join(root, 'node_modules', 'npm', 'bin');
      const prefix = path.join(root, 'global npm');
      const prefixBin = path.join(prefix, 'node_modules', 'npm', 'bin');
      await fs.mkdir(npmBin, {recursive: true});
      await fs.mkdir(prefixBin, {recursive: true});
      await fs.writeFile(shim, '@echo off\r\nexit /b 1\r\n');
      await fs.writeFile(path.join(npmBin, 'npm-prefix.js'), `console.log(${JSON.stringify(prefix)});`);
      await fs.writeFile(path.join(npmBin, 'npm-cli.js'), 'process.exit(1);');
      await fs.writeFile(path.join(prefixBin, 'npm-cli.js'), 'console.log(JSON.stringify(process.argv.slice(2)));');
      t.mock.method(fs, 'which', async () => shim);
      const args = ['path with spaces', 'a&b', '%TEMP%', '^1.0.0', '日本語'];

      const result = await npm.exec('probe', args, {cwd: root, json: true}, {shell: true});

      assert.deepEqual(result.json, ['probe', ...args, '--json']);
    } finally {
      t.mock.restoreAll();
      await fs.rimraf(root);
    }
  });
});
