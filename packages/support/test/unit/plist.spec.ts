import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {fs, node, plist, tempDir} from '../../lib/index.js';

const SUPPORT_ROOT = node.getModuleRootSync('@appium/support', import.meta.filename)!;
const binaryPlistPath = path.join(SUPPORT_ROOT, 'test', 'unit', 'assets', 'sample_binary.plist');
const textPlistPath = path.join(SUPPORT_ROOT, 'test', 'unit', 'assets', 'sample_text.plist');

describe('plist', function () {
  it('should parse plist file as binary', async function () {
    const content = await plist.parsePlistFile(binaryPlistPath);
    assert.ok(Object.hasOwn(content, 'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'));
  });

  it(`should return an empty object if file doesn't exist and mustExist is set to false`, async function () {
    const mustExist = false;
    const content = await plist.parsePlistFile('doesntExist.plist', mustExist);
    assert.strictEqual(typeof content, 'object');
    assert.strictEqual(Object.keys(content as object).length, 0);
  });

  it('should write plist file as binary', async function () {
    const plistFile = path.resolve(await tempDir.openDir(), 'sample.plist');
    await fs.copyFile(binaryPlistPath, plistFile);

    const updatedFields = {
      'io.appium.test': true,
    };
    await plist.updatePlistFile(plistFile, updatedFields, true);

    const content = await plist.parsePlistFile(plistFile);
    assert.ok(Object.hasOwn(content, 'io.appium.test'));
  });

  it('should read binary plist', async function () {
    const content = await fs.readFile(binaryPlistPath);
    const object = plist.parsePlist(content);
    assert.ok(Object.hasOwn(object, 'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'));
  });

  it('should read text plist', async function () {
    const content = await fs.readFile(textPlistPath);
    const object = plist.parsePlist(content);
    assert.ok(Object.hasOwn(object, 'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'));
  });

  it('should read text plist from Uint8Array', async function () {
    const content = await fs.readFile(textPlistPath);
    const object = plist.parsePlist(new Uint8Array(content));
    assert.ok(Object.hasOwn(object, 'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'));
  });

  it('should read binary plist from Uint8Array', async function () {
    const content = await fs.readFile(binaryPlistPath);
    const object = plist.parsePlist(new Uint8Array(content));
    assert.ok(Object.hasOwn(object, 'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'));
  });

  it('should read binary plist from ArrayBuffer', async function () {
    const content = await fs.readFile(binaryPlistPath);
    const object = plist.parsePlist(content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength));
    assert.ok(Object.hasOwn(object, 'com.apple.locationd.bundle-/System/Library/PrivateFrameworks/Parsec.framework'));
  });

  it('should parse nested data payload returned from plist parser', function () {
    const innerPayload = plist.createBinaryPlist({answer: 42});
    const outer = plist.createPlist({payload: innerPayload});
    const outerParsed = plist.parsePlist(outer as string);
    const nestedPayload = (outerParsed as {payload: Uint8Array | Buffer | ArrayBuffer}).payload;
    const nestedParsed = plist.parsePlist(nestedPayload);
    assert.deepStrictEqual(nestedParsed, {answer: 42});
  });

  // Downstream consumers (e.g. appium-ios-device/appium-remote-debugger) call
  // Buffer-only methods like `.toString('utf8')` on decoded plist `<data>` values,
  // so binary payloads must keep coming back as real Buffers, not plain Uint8Arrays.
  it('should return top-level binary data as a Buffer after parsing a binary plist', function () {
    const message = JSON.stringify({id: 1, method: 'foo'});
    const bin = plist.createBinaryPlist({WIRMessageDataKey: Buffer.from(message, 'utf8')});
    const parsed = plist.parsePlist(bin) as {WIRMessageDataKey: Buffer};
    assert.ok(Buffer.isBuffer(parsed.WIRMessageDataKey));
    assert.strictEqual(parsed.WIRMessageDataKey.toString('utf8'), message);
  });

  it('should return nested binary data as Buffers after parsing a binary plist', function () {
    const bin = plist.createBinaryPlist({
      __argument: {WIRSocketDataKey: {inner: Buffer.from('nested-data')}},
      list: [Buffer.from('a'), Buffer.from('b')],
    });
    const parsed = plist.parsePlist(bin) as {
      __argument: {WIRSocketDataKey: {inner: Buffer}};
      list: Buffer[];
    };
    assert.ok(Buffer.isBuffer(parsed.__argument.WIRSocketDataKey.inner));
    assert.strictEqual(parsed.__argument.WIRSocketDataKey.inner.toString(), 'nested-data');
    assert.ok(parsed.list.every((item) => Buffer.isBuffer(item)));
    assert.deepStrictEqual(
      parsed.list.map((item) => item.toString()),
      ['a', 'b'],
    );
  });

  it('should return binary data as a Buffer after parsing an xml plist', function () {
    const xml = plist.createPlist({payload: Buffer.from('xml-data')}, false);
    const parsed = plist.parsePlist(xml) as {payload: Buffer};
    assert.ok(Buffer.isBuffer(parsed.payload));
    assert.strictEqual(parsed.payload.toString(), 'xml-data');
  });
});
