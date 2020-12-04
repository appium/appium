#!/usr/bin/env node

const path = require('path');
const shell = require('shelljs');

const args = process.argv.slice(2);
const HAS_WATCH_FLAG = args[0] === '--watch';

if (HAS_WATCH_FLAG) {
  args.shift();
}

const packages = shell.ls(path.join(__dirname, '..', 'packages'))
  .filter((pkg) => pkg !== 'node_modules')
  .filter((pkg) => args.length === 0 || args.includes(pkg));

shell.cd(path.join(__dirname, '..'));
const buildSpec = `${packages.map((pkg) => `packages/${pkg}`).join(' ')}`;
const cmd = `npx tsc -b ${buildSpec}${HAS_WATCH_FLAG ? ' --watch' : ''}`;

console.log(cmd); // eslint-disable-line no-console
const { code } = shell.exec(cmd);

if (code) {
  throw new Error('Failed compiling TypeScript files!');
}
