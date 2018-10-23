#!/usr/bin/env node
// transpile:main

import { asyncify } from 'asyncbox';
import { exec } from 'teen_process';

async function main () {
  let {stdout: filesChanged} = await exec("git", ["diff", "--name-only", process.env.TRAVIS_COMMIT_RANGE]);
  filesChanged = filesChanged.trim().split("\n");
  if (filesChanged.length === 1 && filesChanged[0] === 'package.json') {
    return process.exit(0);
  }
  process.exit(1);
}

if (require.main === module) {
  asyncify(main);
}

export { main };
