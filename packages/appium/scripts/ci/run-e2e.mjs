#!/usr/bin/env node
// @ts-check
/* eslint-disable no-console */

/**
 * Runs the e2e specs of a shard from `e2e-shards.json`, or all of them if no shard is given.
 * `--list` prints the shard names as JSON. Every spec must belong to exactly one shard.
 */

import {spawnSync} from 'node:child_process';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPEC_SUFFIX = '.e2e.spec';

const shards = /** @type {Record<string, string[]>} */ (
  JSON.parse(readFileSync(path.join(import.meta.dirname, 'e2e-shards.json'), 'utf8'))
);

const specs = readdirSync(path.join(ROOT, 'test', 'e2e'))
  .filter((name) => name.endsWith(`${SPEC_SUFFIX}.ts`))
  .map((name) => name.slice(0, -`${SPEC_SUFFIX}.ts`.length))
  .sort();
const assigned = Object.values(shards).flat();
const problems = [
  ...specs.filter((spec) => !assigned.includes(spec)).map((spec) => `'${spec}' is not in any shard`),
  ...assigned.filter((spec) => !specs.includes(spec)).map((spec) => `'${spec}' does not exist`),
  ...assigned.filter((spec, i) => assigned.indexOf(spec) !== i).map((spec) => `'${spec}' is in several shards`),
];
if (problems.length) {
  console.error(`Invalid e2e-shards.json:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}

const [arg] = process.argv.slice(2);
if (arg === '--list') {
  console.log(JSON.stringify(Object.keys(shards)));
  process.exit(0);
}
if (arg && !shards[arg]) {
  console.error(`Unknown shard '${arg}'. Known shards: ${Object.keys(shards).join(', ')}`);
  process.exit(1);
}

const files = (arg ? shards[arg] : specs).map((spec) => `./build/test/e2e/${spec}${SPEC_SUFFIX}.js`);
const {status, error} = spawnSync(
  process.execPath,
  [
    '--test',
    '--experimental-test-module-mocks',
    '--enable-source-maps',
    '--test-force-exit',
    '--test-concurrency=1',
    '--test-timeout=200000',
    ...files,
  ],
  {cwd: ROOT, stdio: 'inherit'},
);
if (error) {
  throw error;
}
process.exit(status ?? 1);
