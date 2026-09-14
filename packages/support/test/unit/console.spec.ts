import assert from 'node:assert/strict';
import {afterEach, describe, it, type TestContext} from 'node:test';

import * as consoleModule from '../../lib/console.js';

const {CliConsole, stripColors, styleText} = consoleModule;

describe('console', function () {
  it('should expose styleText and stripColors on the module namespace', function () {
    assert.strictEqual(consoleModule.styleText, styleText);
    assert.strictEqual(consoleModule.stripColors, stripColors);
  });

  describe('styleText()', function () {
    it('should accept grey as an alias for gray', function () {
      assert.strictEqual(stripColors(styleText('grey', 'muted')), 'muted');
    });

    it('should strip ANSI sequences from styled text', function () {
      assert.strictEqual(stripColors(styleText('red', 'error')), 'error');
    });

    it('should leave plain text unchanged when stripping', function () {
      assert.strictEqual(stripColors('plain'), 'plain');
    });

    it('should strip non-SGR CSI sequences', function () {
      assert.strictEqual(stripColors('hello\x1b[2Kworld'), 'helloworld');
      assert.strictEqual(stripColors('before\x1b[1Gafter'), 'beforeafter');
    });
  });

  describe('CliConsole', function () {
    describe('decorate()', function () {
      it('should return undefined for undefined input', function () {
        const cli = new CliConsole();
        assert.strictEqual(cli.decorate(undefined, 'info'), undefined);
      });

      it('should return the message unchanged when symbols are disabled', function () {
        const cli = new CliConsole({useSymbols: false});
        assert.strictEqual(cli.decorate('hello', 'success'), 'hello');
      });

      it('should prefix the message with a symbol', function () {
        const cli = new CliConsole({useColor: false});
        const decorated = cli.decorate('done', 'success');
        assert.match(decorated!, /^.\s+done$/);
      });

      it('should colorize when useColor is enabled', function () {
        const cli = new CliConsole({useColor: true});
        const decorated = cli.decorate('done', 'success')!;
        assert.match(stripColors(decorated), /^.\s+done$/);
      });

      describe('when useColor is defaulted from the environment', function () {
        const originalEnv = {...process.env};

        afterEach(function () {
          process.env = {...originalEnv};
        });

        it('should not colorize when NO_COLOR is set', function () {
          process.env.NO_COLOR = '1';
          delete process.env.FORCE_COLOR;
          const cli = new CliConsole();
          const decorated = cli.decorate('done', 'success')!;
          assert.strictEqual(decorated, stripColors(decorated));
        });

        it('should not colorize when FORCE_COLOR is false regardless of case', function () {
          delete process.env.NO_COLOR;
          process.env.FORCE_COLOR = 'FALSE';
          const cli = new CliConsole();
          const decorated = cli.decorate('done', 'success')!;
          assert.strictEqual(decorated, stripColors(decorated));
        });

        it('should colorize when FORCE_COLOR is set', function () {
          delete process.env.NO_COLOR;
          process.env.FORCE_COLOR = '1';
          const cli = new CliConsole({useColor: undefined});
          const decorated = cli.decorate('done', 'success')!;
          assert.match(stripColors(decorated), /^.\s+done$/);
        });
      });
    });

    it('should map symbols to the expected colors', function () {
      assert.deepStrictEqual(CliConsole.symbolToColor, {
        success: 'green',
        info: 'cyan',
        warning: 'yellow',
        error: 'red',
      });
    });

    describe('stream routing', function () {
      function captureWrites(t: TestContext) {
        const stdout: string[] = [];
        const stderr: string[] = [];
        t.mock.method(process.stdout, 'write', (chunk: string) => {
          stdout.push(String(chunk));
          return true;
        });
        t.mock.method(process.stderr, 'write', (chunk: string) => {
          stderr.push(String(chunk));
          return true;
        });
        return {stdout, stderr};
      }

      it('writes log/ok/debug/info/warn to STDOUT only', function (t) {
        const {stdout, stderr} = captureWrites(t);
        const cli = new CliConsole({useSymbols: false});
        cli.log('a');
        cli.ok('b');
        cli.debug('c');
        cli.info('d');
        cli.warn('e');
        assert.deepStrictEqual(stderr, []);
        assert.strictEqual(stdout.join(''), 'a\nb\nc\nd\ne\n');
      });

      it('writes error to STDERR only', function (t) {
        const {stdout, stderr} = captureWrites(t);
        const cli = new CliConsole({useSymbols: false});
        cli.error('boom');
        assert.deepStrictEqual(stdout, []);
        assert.strictEqual(stderr.join(''), 'boom\n');
      });

      it('writes json() to STDOUT only', function (t) {
        const {stdout, stderr} = captureWrites(t);
        const cli = new CliConsole();
        cli.json({a: 1});
        assert.deepStrictEqual(stderr, []);
        assert.strictEqual(stdout.join(''), `${JSON.stringify({a: 1})}\n`);
      });

      describe('in JSON mode', function () {
        it('still writes json() to real STDOUT', function (t) {
          const {stdout, stderr} = captureWrites(t);
          const cli = new CliConsole({jsonMode: true});
          cli.json({a: 1});
          assert.deepStrictEqual(stderr, []);
          assert.strictEqual(stdout.join(''), `${JSON.stringify({a: 1})}\n`);
        });

        it('squelches log/info/warn/ok/debug/error output', function (t) {
          const {stdout, stderr} = captureWrites(t);
          const cli = new CliConsole({jsonMode: true, useSymbols: false});
          cli.log('a');
          cli.info('b');
          cli.warn('c');
          cli.ok('d');
          cli.debug('e');
          cli.error('f');
          assert.deepStrictEqual(stdout, []);
          assert.deepStrictEqual(stderr, []);
        });
      });
    });
  });
});
