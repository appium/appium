import stream from 'node:stream';

/** Returns a Transform stream that base64-encodes incoming binary chunks. */
export function createBase64EncodeStream(): stream.Transform {
  let remainder = Buffer.alloc(0);
  /* eslint-disable promise/prefer-await-to-callbacks -- Node stream Transform API */
  return new stream.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      const input = Buffer.concat([remainder, chunk]);
      const completeByteLength = Math.floor(input.length / 3) * 3;
      if (completeByteLength === 0) {
        remainder = input;
        callback();
        return;
      }
      const encodable = input.subarray(0, completeByteLength);
      remainder = input.subarray(completeByteLength);
      callback(null, toBase64Buffer(encodable));
    },
    flush(callback) {
      if (remainder.length) {
        callback(null, toBase64Buffer(remainder));
      } else {
        callback();
      }
    },
  });
  /* eslint-enable promise/prefer-await-to-callbacks */
}

function toBase64Buffer(data: Buffer): Buffer {
  return Buffer.from(data.toString('base64'), 'latin1');
}
