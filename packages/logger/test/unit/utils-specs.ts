import { expect } from 'chai';
import { ansiBeep, ansiColor, escapeRegExp, isPlainObject, setBlocking, unleakString } from '../../lib/utils';

describe('utils', function () {
  describe('ansiColor', function () {
    it('should encode a single foreground color', function () {
      expect(ansiColor('red')).to.eql('\x1b[31m');
    });

    it('should encode multiple styles', function () {
      expect(ansiColor('cyan', 'bgBlack', 'bold')).to.eql('\x1b[36;40;1m');
    });

    it('should encode reset', function () {
      expect(ansiColor('reset')).to.eql('\x1b[0m');
    });

    it('should throw for unknown style names', function () {
      expect(() => ansiColor('not-a-style')).to.throw('Unknown color or style name: not-a-style');
    });
  });

  describe('ansiBeep', function () {
    it('should return the bell character', function () {
      expect(ansiBeep()).to.eql('\x07');
    });
  });

  describe('setBlocking', function () {
    function createTTYStream(): NodeJS.WriteStream & {
      _handle: { setBlocking: (value: boolean) => void; last?: boolean };
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
        _handle: { setBlocking: (value: boolean) => void; last?: boolean };
      };
    }

    it('should set blocking on TTY streams with setBlocking handles', function () {
      const stdout = createTTYStream();
      const stderr = createTTYStream();

      setBlocking(true, [stdout, stderr]);

      expect(stdout._handle.last).to.be.true;
      expect(stderr._handle.last).to.be.true;
    });

    it('should skip streams that are not TTY', function () {
      const stream = createTTYStream();
      stream.isTTY = false;

      setBlocking(true, [stream]);

      expect(stream._handle.last).to.be.undefined;
    });

    it('should skip streams without a setBlocking handle', function () {
      const stream = { isTTY: true, _handle: {} } as NodeJS.WriteStream & { _handle: object };

      expect(() => setBlocking(true, [stream])).not.to.throw();
    });
  });

  describe('isPlainObject', function () {
    it('should return true for plain objects', function () {
      expect(isPlainObject({})).to.be.true;
      expect(isPlainObject({ a: 1 })).to.be.true;
      expect(isPlainObject(Object.create(null))).to.be.true;
    });

    it('should return false for non-plain values', function () {
      expect(isPlainObject(null)).to.be.false;
      expect(isPlainObject([])).to.be.false;
      expect(isPlainObject(new Date())).to.be.false;
      expect(isPlainObject('x')).to.be.false;
    });
  });

  describe('escapeRegExp', function () {
    it('should escape regexp metacharacters', function () {
      expect(escapeRegExp('a.b(c)')).to.eql('a\\.b\\(c\\)');
    });
  });

  describe('unleakString', function () {
    it('should unleak a string', function () {
      expect(unleakString('yolo')).to.eql('yolo');
    });

    it('should unleak a multiline string', function () {
      expect(unleakString(' yolo\nbolo ')).to.eql(' yolo\nbolo ');
    });

    it('should convert an object to a string', function () {
      for (const obj of [{}, null, undefined, [], 0]) {
        expect(unleakString(obj as any)).to.eql(`${obj}`);
      }
    });
  });
});
