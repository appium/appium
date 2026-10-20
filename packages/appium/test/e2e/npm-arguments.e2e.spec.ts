import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';
import type {TestContext} from 'node:test';

import {fs, system, tempDir} from '@appium/support';

import {NPM, npm} from '../../lib/utils/npm.js';

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

  it('preserves arguments with a project-local Windows npm shim', {skip: !system.isWindows()}, async function (t) {
    const root = await tempDir.openDir();
    try {
      const shimDir = path.join(root, 'project with spaces', 'node_modules', '.bin');
      const shim = path.join(shimDir, 'npm.cmd');
      const npmBin = path.join(shimDir, '..', 'npm', 'bin');
      await fs.mkdir(shimDir, {recursive: true});
      await fs.mkdir(npmBin, {recursive: true});
      await fs.writeFile(shim, '@echo off\r\nexit /b 1\r\n');
      // Local shims run their package directly, without global-prefix selection.
      await fs.writeFile(path.join(npmBin, 'npm-prefix.js'), 'process.exit(1);');
      await fs.writeFile(path.join(npmBin, 'npm-cli.js'), 'console.log(JSON.stringify(process.argv.slice(2)));');
      t.mock.method(fs, 'which', async () => shim);
      const args = ['path with spaces', 'a&b', '%TEMP%', '^1.0.0', '日本語'];

      const result = await npm.exec('probe', args, {cwd: root, json: true}, {shell: true});

      assert.deepEqual(result.json, ['probe', ...args, '--json']);
      assert.equal(result.code, 0);
    } finally {
      t.mock.restoreAll();
      await fs.rimraf(root);
    }
  });

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

describe('Windows npm search path', {skip: !system.isWindows()}, function () {
  for (const key of ['PATH', 'Path']) {
    it(`uses the caller's ${key} instead of the parent PATH`, async function (t) {
      const fixture = await createPathFixture(t);
      const result = await fixture.npm.exec(
        'probe',
        [],
        {cwd: fixture.cwd, json: true},
        {
          env: {...fixture.env, [key]: fixture.callerDirectory},
        },
      );
      assert.equal(result.json, 'caller');
    });
  }

  it('finds the caller npm even when the parent PATH has no npm', async function (t) {
    const fixture = await createPathFixture(t);
    process.env.PATH = fixture.cwd;
    const result = await fixture.npm.exec(
      'probe',
      [],
      {cwd: fixture.cwd, json: true},
      {
        env: {...fixture.env, PATH: fixture.callerDirectory},
      },
    );
    assert.equal(result.json, 'caller');
  });

  it('uses the same case-insensitive PATH key selection as Node', async function (t) {
    const fixture = await createPathFixture(t);
    const result = await fixture.npm.exec(
      'probe',
      [],
      {cwd: fixture.cwd, json: true},
      {
        env: {...fixture.env, Path: process.env.PATH, PATH: fixture.callerDirectory},
      },
    );
    assert.equal(result.json, 'caller');
  });

  it('resolves quoted relative PATH entries against the child working directory', async function (t) {
    const fixture = await createPathFixture(t);
    const result = await fixture.npm.exec(
      'probe',
      [],
      {cwd: fixture.cwd, json: true},
      {
        env: {...fixture.env, PATH: `"${path.relative(fixture.cwd, fixture.callerDirectory)}"`},
      },
    );
    assert.equal(result.json, 'caller');
  });

  for (const searchPath of ['', undefined]) {
    it(`does not use the parent PATH when the child PATH is ${searchPath === '' ? 'empty' : 'absent'}`, async function (t) {
      const fixture = await createPathFixture(t);
      const env = searchPath === undefined ? fixture.env : {...fixture.env, PATH: searchPath};
      await assert.rejects(
        fixture.npm.exec('probe', [], {cwd: fixture.cwd, json: true}, {env}),
        /Cannot find npm\.cmd on PATH/,
      );
    });
  }
});

describe('Windows npm resolver reuse', {skip: !system.isWindows()}, function () {
  for (const customOptions of [false, true]) {
    it(`shares concurrent prefix lookups only without custom process options (${customOptions})`, async function (t) {
      const fixture = await createResolverFixture(t);
      let notifyStarted!: () => void;
      let releaseLookup!: () => void;
      const started = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });
      const release = new Promise<void>((resolve) => {
        releaseLookup = resolve;
      });
      const exists = fs.exists;
      t.mock.method(fs, 'exists', async (file: Parameters<typeof fs.exists>[0]) => {
        if (file === fixture.prefixScript) {
          notifyStarted();
          await release;
        }
        return await exists(file);
      });
      const opts = customOptions ? {timeout: 5000} : {};
      const first = fixture.npm.exec('probe', [], {cwd: fixture.root, json: true}, opts);
      await started;
      const second = fixture.npm.exec('probe', [], {cwd: fixture.root, json: true}, opts);
      // which/realpath are mocked below, so the second lookup reaches the pending
      // resolution before the next event-loop turn, without timing a subprocess.
      await new Promise<void>((resolve) => setImmediate(resolve));
      releaseLookup();
      const results = await Promise.all([first, second]);
      assert.deepEqual(
        results.map((result) => result.json),
        ['first', 'first'],
      );
      assert.equal((await fs.readFile(fixture.counter, 'utf8')).length, customOptions ? 2 : 1);
    });
  }

  it('keeps concurrent resolutions separate for different environments and working directories', async function (t) {
    const fixture = await createResolverFixture(t);
    const otherRoot = path.join(fixture.root, 'other project');
    await fs.mkdir(otherRoot);
    await fs.writeFile(path.join(otherRoot, '.npmrc'), fixture.secondPrefix);
    const results = await Promise.all([
      fixture.npm.exec('probe', [], {cwd: fixture.root, json: true}),
      fixture.npm.exec('probe', [], {cwd: otherRoot, json: true}),
      fixture.npm.exec(
        'probe',
        [],
        {cwd: fixture.root, json: true},
        {
          env: {...process.env, APPIUM_TEST_NPM_PREFIX: fixture.secondPrefix},
        },
      ),
    ]);
    assert.deepEqual(
      results.map((result) => result.json),
      ['first', 'second', 'second'],
    );
    assert.equal((await fs.readFile(fixture.counter, 'utf8')).length, 3);
  });

  it('observes npm configuration changes after a successful resolution', async function (t) {
    const fixture = await createResolverFixture(t);
    const first = await fixture.npm.exec('probe', [], {cwd: fixture.root, json: true});
    await fs.writeFile(path.join(fixture.root, '.npmrc'), fixture.secondPrefix);
    const second = await fixture.npm.exec('probe', [], {cwd: fixture.root, json: true});
    assert.equal(first.json, 'first');
    assert.equal(second.json, 'second');
  });

  it('retries after a failed prefix resolution', async function (t) {
    const fixture = await createResolverFixture(t);
    const script = await fs.readFile(fixture.prefixScript, 'utf8');
    await fs.writeFile(fixture.prefixScript, 'process.exit(1);');
    await assert.rejects(fixture.npm.exec('probe', [], {cwd: fixture.root, json: true}));
    await fs.writeFile(fixture.prefixScript, script);
    assert.equal((await fixture.npm.exec('probe', [], {cwd: fixture.root, json: true})).json, 'first');
  });
});

async function createPathFixture(t: TestContext) {
  const root = await tempDir.openDir();
  const originalPath = process.env.PATH;
  t.after(async () => {
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
    await fs.rimraf(root);
  });
  const cwd = path.join(root, 'child project');
  const callerDirectory = path.join(root, 'caller npm');
  const parentDirectory = path.join(root, 'parent npm');
  await fs.mkdir(cwd);
  for (const [directory, label] of [
    [callerDirectory, 'caller'],
    [parentDirectory, 'parent'],
  ]) {
    const bin = path.join(directory, 'node_modules', 'npm', 'bin');
    await fs.mkdir(bin, {recursive: true});
    await fs.writeFile(path.join(directory, 'npm.cmd'), '@echo off\r\nexit /b 1\r\n');
    await fs.writeFile(path.join(bin, 'npm-cli.js'), `console.log(JSON.stringify(${JSON.stringify(label)}));`);
  }
  process.env.PATH = parentDirectory;
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'));
  return {cwd, callerDirectory, env, npm: new NPM()};
}

async function createResolverFixture(t: TestContext) {
  const root = await tempDir.openDir();
  t.after(async () => {
    t.mock.restoreAll();
    await fs.rimraf(root);
  });
  const shim = path.join(root, 'npm.cmd');
  const npmBin = path.join(root, 'node_modules', 'npm', 'bin');
  const prefixScript = path.join(npmBin, 'npm-prefix.js');
  const counter = path.join(root, 'prefix-invocations');
  const firstPrefix = path.join(root, 'first npm');
  const secondPrefix = path.join(root, 'second npm');
  await fs.mkdir(npmBin, {recursive: true});
  await fs.writeFile(shim, '@echo off\r\nexit /b 1\r\n');
  for (const [prefix, label] of [
    [firstPrefix, 'first'],
    [secondPrefix, 'second'],
  ]) {
    const bin = path.join(prefix, 'node_modules', 'npm', 'bin');
    await fs.mkdir(bin, {recursive: true});
    await fs.writeFile(path.join(bin, 'npm-cli.js'), `console.log(JSON.stringify(${JSON.stringify(label)}));`);
  }
  await fs.writeFile(path.join(root, '.npmrc'), firstPrefix);
  await fs.writeFile(
    prefixScript,
    [
      "const fs = require('node:fs');",
      `fs.appendFileSync(${JSON.stringify(counter)}, 'x');`,
      "console.log(process.env.APPIUM_TEST_NPM_PREFIX || fs.readFileSync('.npmrc', 'utf8'));",
    ].join('\n'),
  );
  t.mock.method(fs, 'which', async () => shim);
  const realpath = fs.realpath;
  t.mock.method(fs, 'realpath', async (file: Parameters<typeof fs.realpath>[0]) =>
    file === shim ? shim : await realpath(file),
  );
  return {root, prefixScript, counter, secondPrefix, npm: new NPM()};
}
