import {sleep} from 'asyncbox';

import {fs} from '../../../lib/index.js';
import * as util from '../../../lib/util.js';

const [, , lockFile, testFile, text, msBeforeActing] = process.argv;

async function main(): Promise<void> {
  const guard = util.getLockFileGuard(lockFile);
  await guard(async () => {
    await sleep(Number(msBeforeActing));
    await fs.appendFile(testFile, text, 'utf8');
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
