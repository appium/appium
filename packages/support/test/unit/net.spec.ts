import assert from 'node:assert/strict';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import path from 'node:path';
import {after, before, describe, it} from 'node:test';

import {fs, tempDir} from '../../lib/index.js';
import {downloadFile, uploadFile} from '../../lib/net.js';

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
