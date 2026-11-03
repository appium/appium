import assert from 'node:assert/strict';
import {realpath, rm} from 'node:fs/promises';
import path from 'node:path';
import {describe, it} from 'node:test';
import type {TestContext} from 'node:test';

import {fs, system, tempDir} from '@appium/support';
import type {TeenProcessExecOptions} from 'teen_process';

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
      const {shim, prefixScript} = await createNpmFixture(
        shimDir,
        'console.log(JSON.stringify(process.argv.slice(2)));',
        path.join(shimDir, '..', 'npm', 'bin'),
      );
      // Local shims run their package directly, without global-prefix selection.
      await fs.writeFile(prefixScript, 'process.exit(1);');
      t.mock.method(fs, 'which', async (command: string) => (command.endsWith('npm.cmd') ? shim : process.execPath));
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
      const {shim, prefixScript} = await createNpmFixture(root, 'process.exit(1);');
      const prefix = path.join(root, 'global npm');
      await createNpmFixture(prefix, 'console.log(JSON.stringify(process.argv.slice(2)));');
      await fs.writeFile(prefixScript, `console.log(${JSON.stringify(prefix)});`);
      t.mock.method(fs, 'which', async (command: string) => (command.endsWith('npm.cmd') ? shim : process.execPath));
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
  for (const rejects of [false, true]) {
    it(
      `does not wait for a later PATH lookup that ${rejects ? 'rejects' : 'resolves'}`,
      {timeout: 5000},
      async function (t) {
        const fixture = await createPathFixture(t);
        const slowDirectory = path.join(fixture.cwd, 'slow path');
        const slowShim = path.join(slowDirectory, 'npm.cmd');
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        let started = false;
        let finished = false;
        const which = fs.which;
        t.mock.method(fs, 'which', async (...args: Parameters<typeof fs.which>) => {
          if (args[0] === slowShim) {
            started = true;
            await gate;
            finished = true;
            if (rejects) {
              throw new Error('Later PATH entry is unavailable');
            }
            return null;
          }
          return await which(...args);
        });
        try {
          const result = await fixture.npm.exec(
            'probe',
            [],
            {cwd: fixture.cwd, json: true},
            {
              env: {...fixture.env, PATH: [fixture.callerDirectory, slowDirectory].join(path.delimiter)},
            },
          );
          assert.equal(result.json, 'caller');
          assert.equal(started, true);
          assert.equal(finished, false);
        } finally {
          release();
          // Let the unused lookup settle, including rejection handling, before cleanup.
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      },
    );
  }

  it('searches PATH entries concurrently while preserving their priority', {timeout: 5000}, async function (t) {
    const fixture = await createPathFixture(t);
    const firstShim = path.join(fixture.callerDirectory, 'npm.cmd');
    const secondShim = path.join(process.env.PATH!, 'npm.cmd');
    let releaseFirst!: () => void;
    const secondFinished = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const which = fs.which;
    t.mock.method(fs, 'which', async (...args: Parameters<typeof fs.which>) => {
      if (args[0] === firstShim) {
        await secondFinished;
      }
      const result = await which(...args);
      if (args[0] === secondShim) {
        releaseFirst();
      }
      return result;
    });
    const result = await fixture.npm.exec(
      'probe',
      [],
      {cwd: fixture.cwd, json: true},
      {
        env: {...fixture.env, PATH: [fixture.callerDirectory, process.env.PATH].join(path.delimiter)},
      },
    );
    assert.equal(result.json, 'caller');
  });

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
      await assert.rejects(fixture.npm.exec('probe', [], {cwd: fixture.cwd, json: true}, {env}), (error: Error) => {
        assert.match(error.message, /Cannot find npm\.cmd on PATH/);
        assert.ok(error.cause instanceof Error);
        assert.equal(error.cause.message, 'Cannot find npm.cmd in the supplied search path');
        return true;
      });
    });
  }
});

describe('Windows npm shim compatibility', {skip: !system.isWindows()}, function () {
  for (const adjacent of [true, false]) {
    it(`uses the ${adjacent ? 'adjacent' : 'child PATH'} Node for the prefix probe and npm`, async function (t) {
      const fixture = await createSelectionFixture(t);
      const node = adjacent ? path.join(fixture.shimDir, 'node.exe') : fixture.node;
      if (adjacent) {
        await fs.copyFile(process.execPath, node);
      }
      const probeNode = path.join(fixture.root, 'probe-node');
      await fs.writeFile(
        fixture.prefixScript,
        [
          `require('node:fs').writeFileSync(${JSON.stringify(probeNode)}, process.execPath);`,
          `console.log(${JSON.stringify(fixture.prefix)});`,
        ].join('\n'),
      );
      const result = await fixture.npm.exec('probe', [], fixture.opts, {env: fixture.env});
      assert.equal(await fs.readFile(probeNode, 'utf8'), node);
      assert.deepEqual(result.json, {label: 'global', node});
    });
  }

  it('recognizes a global prefix named .bin', async function (t) {
    const fixture = await createSelectionFixture(t, '.bin');
    const result = await fixture.npm.exec('probe', [], fixture.opts, {env: fixture.env});
    assert.deepEqual(result.json, {label: 'global', node: fixture.node});
  });

  const outputOptions: [string, TeenProcessExecOptions][] = [
    ['ignoreOutput', {ignoreOutput: true}],
    ['inherited stdio', {stdio: 'inherit'}],
    ['buffer output', {isBuffer: true}],
    ['non-UTF-8 encoding', {encoding: 'hex'}],
    ['small output buffer', {maxStdoutBufferSize: 1}],
  ];
  for (const [name, options] of outputOptions) {
    it(`captures the prefix independently of ${name}`, async function (t) {
      const fixture = await createSelectionFixture(t);
      const result = await fixture.npm.exec('probe', [], fixture.opts, {env: fixture.env, ...options});
      assert.equal(await fs.readFile(fixture.marker, 'utf8'), 'global');
      if (options.isBuffer) {
        assert.ok(Buffer.isBuffer(result.stdout));
      } else if (options.ignoreOutput || options.stdio === 'inherit') {
        assert.equal(result.stdout, '');
      } else if (options.encoding === 'hex') {
        assert.deepEqual(JSON.parse(Buffer.from(result.stdout, 'hex').toString()), {
          label: 'global',
          node: fixture.node,
        });
      } else {
        assert.equal(Buffer.byteLength(result.stdout), 1);
      }
    });
  }

  for (const hasPrefix of [false, true]) {
    it(`handles an unsuccessful prefix helper ${hasPrefix ? 'with' : 'without'} a selected prefix`, async function (t) {
      const fixture = await createSelectionFixture(t);
      await fs.writeFile(
        fixture.prefixScript,
        `${hasPrefix ? `console.log(${JSON.stringify(fixture.prefix)});` : ''}process.exit(7);`,
      );
      const result = await fixture.npm.exec('probe', [], fixture.opts, {env: fixture.env});
      assert.deepEqual(result.json, {label: hasPrefix ? 'global' : 'adjacent', node: fixture.node});
    });
  }

  it('propagates a prefix probe timeout without launching npm', async function (t) {
    const fixture = await createSelectionFixture(t);
    await fs.writeFile(fixture.prefixScript, 'setInterval(() => {}, 1000);');
    await assert.rejects(fixture.npm.exec('probe', [], fixture.opts, {env: fixture.env, timeout: 100}), /timed out/);
    assert.equal(await fs.exists(fixture.marker), false);
  });

  it('propagates cancellation without launching npm', async function (t) {
    const fixture = await createSelectionFixture(t);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(fixture.npm.exec('probe', [], fixture.opts, {env: fixture.env, signal: controller.signal}), {
      name: 'AbortError',
    });
    assert.equal(await fs.exists(fixture.marker), false);
  });
});

describe('Windows npm resolution', {skip: !system.isWindows()}, function () {
  it('resolves the prefix independently for concurrent calls with the same context', async function (t) {
    const fixture = await createResolverFixture(t);
    const results = await Promise.all([
      fixture.npm.exec('probe', [], {cwd: fixture.root, json: true}),
      fixture.npm.exec('probe', [], {cwd: fixture.root, json: true}),
    ]);
    assert.deepEqual(
      results.map((result) => result.json),
      ['first', 'first'],
    );
    assert.equal((await fs.readFile(fixture.counter, 'utf8')).length, 2);
  });

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
  // The child PATH deliberately contains only fixture npm installations.
  await fs.copyFile(process.execPath, path.join(cwd, 'node.exe'));
  for (const [directory, label] of [
    [callerDirectory, 'caller'],
    [parentDirectory, 'parent'],
  ]) {
    await createNpmFixture(directory, `console.log(JSON.stringify(${JSON.stringify(label)}));`);
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
  const {shim, prefixScript} = await createNpmFixture(root, 'process.exit(1);');
  const counter = path.join(root, 'prefix-invocations');
  const firstPrefix = path.join(root, 'first npm');
  const secondPrefix = path.join(root, 'second npm');
  for (const [prefix, label] of [
    [firstPrefix, 'first'],
    [secondPrefix, 'second'],
  ]) {
    await createNpmFixture(prefix, `console.log(JSON.stringify(${JSON.stringify(label)}));`);
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
  t.mock.method(fs, 'which', async (command: string) => (command.endsWith('npm.cmd') ? shim : process.execPath));
  return {root, prefixScript, counter, secondPrefix, npm: new NPM()};
}

async function createNpmFixture(
  shimDir: string,
  cliSource: string,
  npmBin = path.join(shimDir, 'node_modules', 'npm', 'bin'),
) {
  const shim = path.join(shimDir, 'npm.cmd');
  await fs.mkdir(shimDir, {recursive: true});
  await fs.mkdir(npmBin, {recursive: true});
  await fs.writeFile(shim, '@echo off\r\nexit /b 1\r\n');
  await fs.writeFile(path.join(npmBin, 'npm-cli.js'), cliSource);
  return {shim, prefixScript: path.join(npmBin, 'npm-prefix.js')};
}

async function createSelectionFixture(t: TestContext, shimName = 'npm installation') {
  // Expand 8.3 short names so that paths match `process.execPath` of child processes
  const root = await realpath(await tempDir.openDir());
  t.after(async () => {
    // A killed child may still hold its node.exe for a moment
    await rm(root, {recursive: true, force: true, maxRetries: 10});
  });
  const shimDir = path.join(root, shimName);
  const marker = path.join(root, 'selected-cli');
  const source = (label: string) =>
    [
      `require('node:fs').writeFileSync(${JSON.stringify(marker)}, ${JSON.stringify(label)});`,
      `console.log(JSON.stringify({label: ${JSON.stringify(label)}, node: process.execPath}));`,
    ].join('\n');
  const {prefixScript} = await createNpmFixture(shimDir, source('adjacent'));
  const prefix = path.join(root, 'global npm');
  await createNpmFixture(prefix, source('global'));
  await fs.writeFile(prefixScript, `console.log(${JSON.stringify(prefix)});`);
  const runtime = path.join(root, 'other node');
  await fs.mkdir(runtime);
  const node = path.join(runtime, 'node.exe');
  await fs.copyFile(process.execPath, node);
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH')),
    PATH: [shimDir, runtime].join(path.delimiter),
  };
  return {root, shimDir, marker, prefix, prefixScript, node, env, npm: new NPM(), opts: {cwd: root, json: true}};
}
