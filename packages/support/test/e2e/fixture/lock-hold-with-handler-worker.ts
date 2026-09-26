import * as util from '../../../lib/util.js';

const [, , lockFile] = process.argv;

let sigintCount = 0;
process.on('SIGINT', () => {
  sigintCount += 1;
  process.stdout.write(`sigint:${sigintCount}\n`);
});

async function main(): Promise<void> {
  const guard = util.getLockFileGuard(lockFile);
  await guard(async () => {
    process.stdout.write('locked\n');
    // Keep the event loop (and thus the process, and the lock) alive until killed.
    await new Promise(() => setInterval(() => {}, 60000));
  });
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : e}\n`);
  process.exitCode = 1;
});
