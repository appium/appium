import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {createBase64EncodeStream} from '../../../lib/internal/base64-encode-stream';

function splitIntoChunks(data: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    chunks.push(data.subarray(offset, offset + chunkSize));
  }
  return chunks;
}

function encodeChunks(chunks: Buffer[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const encoder = createBase64EncodeStream();
    const parts: Buffer[] = [];

    encoder.on('data', (chunk: Buffer) => parts.push(chunk));
    encoder.on('error', reject);
    encoder.on('finish', () => resolve(Buffer.concat(parts).toString('utf8')));

    for (const chunk of chunks) {
      encoder.write(chunk);
    }
    encoder.end();
  });
}

describe('internal/base64-encode-stream', function () {
  describe('createBase64EncodeStream()', function () {
    it('should emit Buffer chunks', async function () {
      const encoder = createBase64EncodeStream();
      const chunks: unknown[] = [];

      encoder.on('data', (chunk) => chunks.push(chunk));
      encoder.end(Buffer.from('hello'));

      await new Promise<void>((resolve) => encoder.on('finish', () => resolve()));

      assert.ok(chunks.length > 0);
      assert.strictEqual(
        chunks.every((chunk) => Buffer.isBuffer(chunk)),
        true,
      );
    });

    it('should encode an empty stream', async function () {
      assert.strictEqual(await encodeChunks([]), '');
    });

    it('should encode a single chunk', async function () {
      const input = Buffer.from('hello world');
      assert.strictEqual(await encodeChunks([input]), input.toString('base64'));
    });

    it('should encode input split into single-byte chunks', async function () {
      const input = Buffer.from('The quick brown fox jumps over the lazy dog');
      const encoded = await encodeChunks(splitIntoChunks(input, 1));
      assert.strictEqual(encoded, input.toString('base64'));
    });

    it('should encode input split into chunks that are not multiples of three bytes', async function () {
      const input = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      for (const chunkSize of [1, 2, 4, 5, 7]) {
        const encoded = await encodeChunks(splitIntoChunks(input, chunkSize));
        assert.strictEqual(encoded, input.toString('base64'), `chunk size ${chunkSize}`);
      }
    });

    it('should flush trailing bytes that do not complete a base64 triplet', async function () {
      const oneByte = Buffer.from('a');
      const twoBytes = Buffer.from('ab');

      assert.strictEqual(await encodeChunks([oneByte]), oneByte.toString('base64'));
      assert.strictEqual(await encodeChunks([twoBytes]), twoBytes.toString('base64'));
      assert.strictEqual(await encodeChunks(splitIntoChunks(twoBytes, 1)), twoBytes.toString('base64'));
    });

    it('should match Buffer base64 encoding for varied payload lengths', async function () {
      const payloads = [
        Buffer.alloc(0),
        Buffer.from('x'),
        Buffer.from('xy'),
        Buffer.from('xyz'),
        Buffer.alloc(256, 0xab),
        Buffer.from('0123456789abcdef', 'hex'),
      ];

      for (const payload of payloads) {
        const encoded = await encodeChunks(splitIntoChunks(payload, 3));
        assert.strictEqual(encoded, payload.toString('base64'), `payload length ${payload.length}`);
      }
    });
  });
});
