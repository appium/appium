import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {ansiBeep, ansiColor, escapeRegExp, isPlainObject, setBlocking, unleakString} from '../../lib/utils';

describe('utils', function () {
  describe('ansiColor', function () {
    it('should encode a single foreground color', function () {
      assert.deepStrictEqual(ansiColor('red'), '\x1b[31m');
    });

    it('should encode multiple styles', function () {
      assert.deepStrictEqual(ansiColor('cyan', 'bgBlack', 'bold'), '\x1b[36;40;1m');
    });

    it('should encode reset', function () {
      assert.deepStrictEqual(ansiColor('reset'), '\x1b[0m');
    });

    it('should throw for unknown style names', function () {
      assert.throws(() => ansiColor('not-a-style'), /Unknown color or style name: not-a-style/);
    });
  });

  describe('ansiBeep', function () {
    it('should return the bell character', function () {
      assert.deepStrictEqual(ansiBeep(), '\x07');
    });
  });

  describe('setBlocking', function () {
    function createTTYStream(): NodeJS.WriteStream & {
      _handle: {setBlocking: (value: boolean) => void; last?: boolean};
    } {
      const handle = {
        last: undefined as boolean | undefined,
        setBlocking(value: boolean) {
          this.last = value;
        },
      };
      return {
        isTTY: true,
        _handle: handle,
      } as NodeJS.WriteStream & {
        _handle: {setBlocking: (value: boolean) => void; last?: boolean};
      };
    }

    it('should set blocking on TTY streams with setBlocking handles', function () {
      const stdout = createTTYStream();
      const stderr = createTTYStream();

      setBlocking(true, [stdout, stderr]);

      assert.strictEqual(stdout._handle.last, true);
      assert.strictEqual(stderr._handle.last, true);
    });

    it('should skip streams that are not TTY', function () {
      const stream = createTTYStream();
      stream.isTTY = false;

      setBlocking(true, [stream]);

      assert.strictEqual(stream._handle.last, undefined);
    });

    it('should skip streams without a setBlocking handle', function () {
      const stream = {isTTY: true, _handle: {}} as NodeJS.WriteStream & {_handle: object};

      assert.doesNotThrow(() => setBlocking(true, [stream]));
    });
  });

  describe('isPlainObject', function () {
    it('should return true for plain objects', function () {
      assert.strictEqual(isPlainObject({}), true);
      assert.strictEqual(isPlainObject({a: 1}), true);
      assert.strictEqual(isPlainObject(Object.create(null)), true);
    });

    it('should return false for non-plain values', function () {
      assert.strictEqual(isPlainObject(null), false);
      assert.strictEqual(isPlainObject([]), false);
      assert.strictEqual(isPlainObject(new Date()), false);
      assert.strictEqual(isPlainObject('x'), false);
    });
  });

  describe('escapeRegExp', function () {
    it('should escape regexp metacharacters', function () {
      assert.deepStrictEqual(escapeRegExp('a.b(c)'), 'a\\.b\\(c\\)');
    });
  });

  describe('unleakString', function () {
    it('should unleak a string', function () {
      assert.deepStrictEqual(unleakString('yolo'), 'yolo');
    });

    it('should unleak a multiline string', function () {
      assert.deepStrictEqual(unleakString(' yolo\nbolo '), ' yolo\nbolo ');
    });

    it('should convert an object to a string', function () {
      for (const obj of [{}, null, undefined, [], 0]) {
        assert.deepStrictEqual(unleakString(obj as any), `${obj}`);
      }
    });
  });
});
