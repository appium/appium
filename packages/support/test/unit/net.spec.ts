import assert from 'node:assert/strict';
import http from 'node:http';
import net, {type AddressInfo} from 'node:net';
import path from 'node:path';
import {after, before, describe, it} from 'node:test';
import {promisify} from 'node:util';
import {gzip} from 'node:zlib';

import {fs, tempDir} from '../../lib/index.js';
import {
  checkPortStatus,
  downloadFile,
  formatHostnameForUrl,
  getFreePort,
  NoFreePortError,
  uploadFile,
} from '../../lib/net.js';

const FILE_BYTES = 100;

async function receiveUpload(run: (url: string) => Promise<void>): Promise<{
  headerLength: number | undefined;
  received: number;
  contentType: string | undefined;
}> {
  let headerLength: string | undefined;
  let received = 0;
  let contentType: string | undefined;
  const server = http.createServer((req, res) => {
    headerLength = req.headers['content-length'];
    contentType = req.headers['content-type'];
    req.on('data', (chunk) => {
      received += chunk.length;
    });
    req.on('end', () => {
      res.writeHead(200);
      res.end('ok');
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const {port} = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}/upload`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  return {
    headerLength: headerLength === undefined ? undefined : Number(headerLength),
    received,
    contentType,
  };
}

describe('net', function () {
  describe('formatHostnameForUrl', function () {
    for (const [hostname, expected] of [
      ['::1', '[::1]'],
      ['::', '[::]'],
      ['2001:db8::1', '[2001:db8::1]'],
      ['::ffff:192.0.2.1', '[::ffff:192.0.2.1]'],
      ['[::1]', '[::1]'],
      ['127.0.0.1', '127.0.0.1'],
      ['localhost', 'localhost'],
      ['example.com', 'example.com'],
      ['', ''],
    ]) {
      it(`should format ${JSON.stringify(hostname)} idempotently`, function () {
        const result = formatHostnameForUrl(hostname);
        assert.equal(result, expected);
        assert.equal(formatHostnameForUrl(result), expected);
      });
    }
  });

  describe('uploadFile()', function () {
    it('should accept remote URLs typed as strings', function () {
      const upload = (remoteUri: string) =>
        uploadFile('/path/to/local/file', remoteUri, {
          method: 'PUT',
          headers: {'content-type': 'video/mp4'},
        });

      assert.strictEqual(typeof upload, 'function');
    });

    describe('HTTP upload', function () {
      let tmpDir: string;
      let localPath: string;

      before(async function () {
        tmpDir = await tempDir.openDir();
        localPath = path.join(tmpDir, 'payload.bin');
        await fs.writeFile(localPath, Buffer.alloc(FILE_BYTES, 0x61));
      });

      after(async function () {
        await fs.rimraf(tmpDir);
      });

      it('should send a complete multipart body when fileFieldName is omitted', async function () {
        const {headerLength, received, contentType} = await receiveUpload((url) =>
          uploadFile(localPath, url, {isMetered: false}),
        );
        assert.match(String(contentType), /multipart\/form-data/i);
        assert.ok(received > FILE_BYTES);
        assert.strictEqual(headerLength, received);
      });

      it('should send a complete multipart body when fileFieldName is set', async function () {
        const {headerLength, received, contentType} = await receiveUpload((url) =>
          uploadFile(localPath, url, {isMetered: false, fileFieldName: 'file'}),
        );
        assert.match(String(contentType), /multipart\/form-data/i);
        assert.ok(received > FILE_BYTES);
        assert.strictEqual(headerLength, received);
      });

      // any falsy fileFieldName is documented as a raw upload, so it must carry Content-Length
      it('should send a raw body with Content-Length when fileFieldName is null', async function () {
        const {headerLength, received, contentType} = await receiveUpload((url) =>
          uploadFile(localPath, url, {
            isMetered: false,
            fileFieldName: null as unknown as string,
          }),
        );
        assert.doesNotMatch(String(contentType ?? ''), /multipart\/form-data/i);
        assert.strictEqual(received, FILE_BYTES);
        assert.strictEqual(headerLength, FILE_BYTES);
      });

      it('should send a raw body when fileFieldName is empty', async function () {
        const {headerLength, received, contentType} = await receiveUpload((url) =>
          uploadFile(localPath, url, {isMetered: false, fileFieldName: ''}),
        );
        assert.doesNotMatch(String(contentType ?? ''), /multipart\/form-data/i);
        assert.strictEqual(received, FILE_BYTES);
        assert.strictEqual(headerLength, FILE_BYTES);
      });
    });
  });

  describe('downloadFile()', function () {
    let tmpDir: string;

    before(async function () {
      tmpDir = await tempDir.openDir();
    });

    after(async function () {
      await fs.rimraf(tmpDir);
    });

    it('should preserve a directory and its contents when the destination cannot be opened', async function () {
      const directory = path.join(tmpDir, 'existing-directory');
      await fs.mkdir(directory);
      const existingFile = path.join(directory, 'keep.txt');
      await fs.writeFile(existingFile, 'keep me');
      await assert.rejects(
        withServer(
          (res) => res.end('download'),
          (url) => downloadFile(url, directory, {isMetered: false}),
        ),
        /EISDIR/,
      );
      assert.equal(await fs.readFile(existingFile, 'utf8'), 'keep me');
    });

    it('should save a complete body', async function () {
      const body = Buffer.from('plain body');
      const dstPath = path.join(tmpDir, 'plain.bin');
      await withServer(
        (res) => {
          res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': String(body.length)});
          res.end(body);
        },
        async (url) => {
          await downloadFile(url, dstPath, {isMetered: false});
        },
      );
      assert.deepEqual(await fs.readFile(dstPath), body);
    });

    it('should save a decompressed body with a compressed Content-Length', async function () {
      const body = Buffer.from('compressible download payload '.repeat(100));
      const compressed = await promisify(gzip)(body);
      const dstPath = path.join(tmpDir, 'compressed.bin');
      await withServer(
        (res) => {
          res.writeHead(200, {'Content-Encoding': 'gzip', 'Content-Length': String(compressed.length)});
          res.end(compressed);
        },
        (url) => downloadFile(url, dstPath, {isMetered: false}),
      );
      assert.deepEqual(await fs.readFile(dstPath), body);
    });

    it('should still reject and remove a truncated compressed download', async function () {
      const compressed = await promisify(gzip)(Buffer.from('compressed payload '.repeat(100)));
      const dstPath = path.join(tmpDir, 'truncated-compressed.bin');
      await assert.rejects(
        withServer(
          (res) => {
            res.writeHead(200, {'Content-Encoding': 'gzip', 'Content-Length': String(compressed.length)});
            res.write(compressed.subarray(0, -4));
            setTimeout(() => res.destroy(), 100);
          },
          (url) => downloadFile(url, dstPath, {isMetered: false}),
        ),
        /download the file/,
      );
      assert.equal(await fs.exists(dstPath), false);
    });

    it('should not leave a file behind when the request fails', async function () {
      const dstPath = path.join(tmpDir, 'missing.bin');
      await assert.rejects(
        withServer(
          (res) => {
            res.writeHead(404, {'Content-Type': 'text/plain', 'Content-Length': '9'});
            res.end('not found');
          },
          (url) => downloadFile(url, dstPath, {isMetered: false}),
        ),
        /404/,
      );
      assert.strictEqual(await fs.exists(dstPath), false);
    });

    it('should close the file and not leave it behind when the response stream fails', async function () {
      const dstPath = path.join(tmpDir, 'partial.bin');
      const originalCreateWriteStream = fs.createWriteStream;
      const writers: ReturnType<typeof fs.createWriteStream>[] = [];
      fs.createWriteStream = ((...args: Parameters<typeof fs.createWriteStream>) => {
        const writer = originalCreateWriteStream(...args);
        writers.push(writer);
        return writer;
      }) as typeof fs.createWriteStream;
      try {
        await assert.rejects(
          withServer(
            (res) => {
              res.writeHead(200, {'Content-Type': 'application/octet-stream', 'Content-Length': '1000'});
              res.flushHeaders();
              res.write(Buffer.alloc(20, 1));
              setTimeout(() => res.destroy(), 100);
            },
            (url) => downloadFile(url, dstPath, {isMetered: false}),
          ),
          /download the file/,
        );
      } finally {
        fs.createWriteStream = originalCreateWriteStream;
      }
      assert.strictEqual(writers.length, 1);
      assert.strictEqual(writers[0].closed, true);
      assert.strictEqual(await fs.exists(dstPath), false);
    });
  });
});

async function withServer(
  respond: (res: http.ServerResponse) => void,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const server = http.createServer((_req, res) => {
    respond(res);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const {port} = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}/file`);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

describe('port helpers', () => {
  type Listener = {port: number; close: () => Promise<void>};

  async function listen(port = 0): Promise<Listener> {
    const server = net.createServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => resolve());
    });
    return {
      port: (server.address() as AddressInfo).port,
      close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
  }

  // Listens on an OS-assigned port that leaves `room` ports above it within the valid range
  async function listenWithRoom(room: number): Promise<Listener> {
    for (;;) {
      const l = await listen();
      if (l.port + room <= 65535) {
        return l;
      }
      await l.close();
    }
  }

  it('getFreePort returns a bindable port', async () => {
    const port = await getFreePort();
    assert.ok(Number.isInteger(port) && port > 0);
    assert.equal(await checkPortStatus(port), 'closed');
    const bound = await listen(port);
    try {
      assert.equal(bound.port, port);
      assert.equal(await checkPortStatus(port), 'open');
    } finally {
      await bound.close();
    }
  });

  it('checkPortStatus reports open for a listening port', async () => {
    const busy = await listen();
    try {
      assert.equal(await checkPortStatus(busy.port), 'open');
    } finally {
      await busy.close();
    }
    assert.equal(await checkPortStatus(busy.port), 'closed');
  });

  it('checkPortStatus accepts host and timeoutMs options', async () => {
    const busy = await listen();
    try {
      assert.equal(await checkPortStatus(busy.port, {host: '127.0.0.1', timeoutMs: 1000}), 'open');
    } finally {
      await busy.close();
    }
  });

  it('checkPortStatus rejects invalid ports', async () => {
    await assert.rejects(checkPortStatus(0), RangeError);
    await assert.rejects(checkPortStatus(70000), RangeError);
  });

  it('getFreePort skips ports in use within a range', async () => {
    const busy = await listenWithRoom(20);
    try {
      const found = await getFreePort({host: '127.0.0.1', port: [busy.port, busy.port + 20]});
      assert.ok(found > busy.port);
    } finally {
      await busy.close();
    }
  });

  it('getFreePort throws if the range is exhausted', async () => {
    const busy = await listen();
    try {
      await assert.rejects(getFreePort({host: '127.0.0.1', port: [busy.port, busy.port]}), (err: unknown) => {
        assert.ok(err instanceof NoFreePortError);
        assert.equal(err.startPort, busy.port);
        assert.equal(err.endPort, busy.port);
        assert.match(err.message, /No free port available/);
        return true;
      });
    } finally {
      await busy.close();
    }
  });

  it('getFreePort accepts a single port', async () => {
    const free = await getFreePort({host: '127.0.0.1'});
    assert.equal(await getFreePort({host: '127.0.0.1', port: free}), free);
    const busy = await listen();
    try {
      await assert.rejects(getFreePort({host: '127.0.0.1', port: busy.port}), NoFreePortError);
    } finally {
      await busy.close();
    }
  });

  it('getFreePort rejects invalid ranges', async () => {
    await assert.rejects(getFreePort({port: [5000, 4000]}), RangeError);
    await assert.rejects(getFreePort({port: [0, 10]}), RangeError);
    await assert.rejects(getFreePort({port: 0}), RangeError);
  });
});
