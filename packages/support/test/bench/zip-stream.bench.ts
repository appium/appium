/**
 * Compares ZIP extraction strategies. It is not a part of the test suites.
 *
 *   npm run build -w @appium/support
 *   node packages/support/build/test/bench/zip-stream.bench.js [--rate <Mbit/s>] [--runs <n>] [archive.zip ...]
 *
 * Without archives a synthetic one (thousands of small files plus big ones) is generated.
 * `--rate` throttles the simulated download, to see how much time is left after the last byte arrives.
 */
/* oxlint-disable no-console -- command line output */
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import {once} from 'node:events';
import nodeFs from 'node:fs';
import path from 'node:path';

import {fs, tempDir, zip} from '../../lib/index.js';

interface Strategy {
  name: string;
  run: (archive: string, destDir: string, source: () => AsyncIterable<Buffer>) => Promise<void>;
}

const args = process.argv.slice(2);
const takeOption = (name: string, fallback: number): number => {
  const index = args.indexOf(name);
  if (index < 0) {
    return fallback;
  }
  const [, value] = args.splice(index, 2);
  return Number(value);
};
const rateMbit = takeOption('--rate', 0);
const runs = takeOption('--runs', 3);
const archives = args;

const lastByteAt = {value: 0};

function throttledSource(archive: string): () => AsyncIterable<Buffer> {
  const bytesPerSecond = (rateMbit * 1e6) / 8;
  return async function* () {
    const start = performance.now();
    let sent = 0;
    for await (const chunk of nodeFs.createReadStream(archive)) {
      sent += chunk.length;
      if (bytesPerSecond) {
        const wait = start + (sent / bytesPerSecond) * 1000 - performance.now();
        if (wait > 1) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      }
      lastByteAt.value = performance.now();
      yield chunk;
    }
  };
}

async function viaBsdtar(_archive: string, destDir: string, source: () => AsyncIterable<Buffer>): Promise<void> {
  const child = spawn('bsdtar', ['-x', '--exclude', '__MACOSX', '--exclude', '__MACOSX/*', '-f', '-'], {
    cwd: destDir,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  const closed = once(child, 'close');
  let gone = false;
  child.stdin.on('error', () => {});
  child.stdin.on('close', () => {
    gone = true;
  });
  for await (const chunk of source()) {
    if (gone) {
      break;
    }
    if (!child.stdin.write(chunk)) {
      // bsdtar stops reading at the central directory, so the pipe may close here
      await Promise.race([once(child.stdin, 'drain'), once(child.stdin, 'close')]).catch(() => {});
    }
  }
  child.stdin.end();
  const [code] = await closed;
  if (code) {
    throw new Error(`bsdtar exited with ${code}`);
  }
}

const strategies: Strategy[] = [
  {
    name: 'bsdtar pipe',
    run: viaBsdtar,
  },
  {
    name: 'download, then extractAllTo',
    async run(_archive, destDir, source) {
      const downloaded = path.join(destDir, '.download.zip');
      const target = nodeFs.createWriteStream(downloaded);
      for await (const chunk of source()) {
        if (!target.write(chunk)) {
          await once(target, 'drain');
        }
      }
      target.end();
      await once(target, 'finish');
      const out = path.join(destDir, 'out');
      await zip.extractAllTo(downloaded, out, {fileNamesEncoding: 'utf8'});
    },
  },
  {
    name: 'extractStreamTo',
    async run(_archive, destDir, source) {
      await zip.extractStreamTo(source(), destDir, {fileNamesEncoding: 'utf8'});
    },
  },
];

async function generateArchive(root: string): Promise<string> {
  const tree = path.join(root, 'tree');
  for (let i = 0; i < 8000; i++) {
    const dir = path.join(tree, 'App.app', `d${i % 40}`, `s${i % 7}`);
    await fs.mkdir(dir, {recursive: true});
    const size = 100 + ((i * 7919) % 30000);
    const content =
      i % 3 ? Buffer.from('lorem ipsum '.repeat(Math.ceil(size / 12))).subarray(0, size) : crypto.randomBytes(size);
    await fs.writeFile(path.join(dir, `f${i}.${i % 3 ? 'plist' : 'png'}`), content);
  }
  await fs.writeFile(path.join(tree, 'App.app', 'big-random.bin'), crypto.randomBytes(100 * 1024 * 1024));
  await fs.writeFile(path.join(tree, 'App.app', 'big-text.bin'), Buffer.from('lorem ipsum '.repeat(10_000_000)));
  const archive = path.join(root, 'synthetic.zip');
  await zip.toArchive(archive, {cwd: tree}, {level: 6});
  return archive;
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const root = await fs.realpath(await tempDir.openDir());
try {
  const targets = archives.length ? archives : [await generateArchive(root)];
  for (const archive of targets) {
    const size = (await fs.stat(archive)).size;
    console.log(`\n${path.basename(archive)} (${(size / 1048576).toFixed(0)} MiB), ${rateMbit || 'unlimited'} Mbit/s`);
    const download = throttledSource(archive);
    for (const strategy of strategies) {
      const totals: number[] = [];
      const tails: number[] = [];
      // The first run warms the file cache when the source is not throttled
      for (let run = 0; run < runs + (rateMbit ? 0 : 1); run++) {
        const destDir = path.join(root, 'out');
        await fs.rimraf(destDir);
        await fs.mkdir(destDir);
        const start = performance.now();
        await strategy.run(archive, destDir, download);
        const end = performance.now();
        if (rateMbit || run > 0) {
          totals.push(end - start);
          tails.push(end - lastByteAt.value);
        }
      }
      const tail = rateMbit ? `, ${median(tails).toFixed(0)} ms after the last byte` : '';
      console.log(`  ${strategy.name.padEnd(30)} ${median(totals).toFixed(0).padStart(6)} ms${tail}`);
    }
  }
} finally {
  await fs.rimraf(root);
}
