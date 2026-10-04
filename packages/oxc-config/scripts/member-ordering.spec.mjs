import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const oxlintBin = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin', 'oxlint');
const configUrl = new URL('../oxlint.mjs', import.meta.url).href;
const ruleCode = 'typescript-eslint-js(member-ordering)';
const unorderedClasses = `
export class Example {
  private helper() {}
  public run() { this.helper(); }
}
export const Expression = class {
  private helper() {}
  public run() { this.helper(); }
};
`;

describe('member ordering through Oxlint JS plugins', function () {
  let root;
  let fixture;

  beforeEach(async function () {
    // A consuming project outside the monorepo has no direct plugin dependency. Exercise
    // config inheritance and package-relative plugin resolution, not a manually loaded rule.
    root = await mkdtemp(path.join(os.tmpdir(), 'appium-member-ordering-'));
    fixture = path.join(root, 'fixture.ts');
    await writeFile(
      path.join(root, 'oxlint.config.mjs'),
      `import config from ${JSON.stringify(configUrl)};
export default {extends: [config], options: {typeAware: false}};
`,
    );
  });

  afterEach(async function () {
    await rm(root, {recursive: true, force: true});
  });

  it('should warn about class and class-expression member ordering', async function () {
    await writeFile(fixture, unorderedClasses);
    const result = await lint();
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.diagnostics.length, 2);
    for (const diagnostic of result.diagnostics) {
      assert.equal(diagnostic.code, ruleCode);
      assert.equal(diagnostic.severity, 'warning');
      assert.match(diagnostic.message, /Member run should be declared before all private/);
    }
  });

  it('should accept ordered classes and leave interfaces and type literals unrestricted', async function () {
    await writeFile(
      fixture,
      `export class Example {
  public run() { this.protectedHelper(); }
  protected protectedHelper() { this.privateHelper(); }
  private privateHelper() {}
}
export interface ExampleInterface {
  run(): void;
  field: string;
}
export type ExampleType = {
  run(): void;
  field: string;
};
`,
    );
    const result = await lint();
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(result.diagnostics, []);
  });

  it('should continue reporting ordering violations with --fix without changing the source', async function () {
    await writeFile(fixture, unorderedClasses);
    const result = await lint('--fix', '--max-warnings', '0');
    assert.equal(result.code, 1);
    assert.equal(result.diagnostics.filter(({code}) => code === ruleCode).length, 2);
    assert.equal(await readFile(fixture, 'utf8'), unorderedClasses);
  });

  async function lint(...args) {
    let result;
    try {
      result = {
        code: 0,
        ...(await exec(process.execPath, [oxlintBin, '-c', 'oxlint.config.mjs', '--format', 'json', ...args, fixture], {
          cwd: root,
        })),
      };
    } catch (err) {
      if (err.code !== 1) {
        throw err;
      }
      result = err;
    }
    return {...result, diagnostics: JSON.parse(result.stdout).diagnostics};
  }
});
