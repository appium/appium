import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {after, before, describe, it} from 'node:test';

import {transformers} from '../../../lib/schema/cli-transformers';

describe('cli-transformers', function () {
  let tmpDir: string;
  let prevCwd: string;

  before(function () {
    prevCwd = process.cwd();
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'appium-cli-transformers-'));
    process.chdir(tmpDir);
  });

  after(function () {
    process.chdir(prevCwd);
    rmSync(tmpDir, {recursive: true, force: true});
  });

  describe('csv', function () {
    it('should parse a comma-delimited string', function () {
      assert.deepStrictEqual(transformers.csv('adb_shell,get_server_logs'), ['adb_shell', 'get_server_logs']);
    });

    it('should treat a directory as a literal value instead of reading it', function () {
      mkdirSync(path.join(tmpDir, 'adb_shell'));
      assert.deepStrictEqual(transformers.csv('adb_shell'), ['adb_shell']);
    });

    it('should still load a CSV file when the path is a regular file', function () {
      const file = path.join(tmpDir, 'features.csv');
      writeFileSync(file, 'adb_shell\nget_server_logs\n', 'utf8');
      assert.deepStrictEqual(transformers.csv(file), ['adb_shell', 'get_server_logs']);
    });
  });

  describe('json', function () {
    it('should parse a JSON string', function () {
      assert.deepStrictEqual(transformers.json('{"foo":1}'), {foo: 1});
    });

    it('should parse a JSON string longer than the max filename length', function () {
      // a value this long fails stat() with ENAMETOOLONG instead of ENOENT on posix systems
      const caps = {'appium:app': 'a'.repeat(300)};
      assert.deepStrictEqual(transformers.json(JSON.stringify(caps)), caps);
    });

    it('should treat a directory as a literal value instead of reading it', function () {
      mkdirSync(path.join(tmpDir, 'caps'));
      assert.throws(() => transformers.json('caps'), /must be a valid JSON/i);
    });

    it('should still load a JSON file when the path is a regular file', function () {
      const file = path.join(tmpDir, 'caps.json');
      writeFileSync(file, '{"foo":1}', 'utf8');
      assert.deepStrictEqual(transformers.json(file), {foo: 1});
    });
  });
});
