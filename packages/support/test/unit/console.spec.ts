import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import * as consoleModule from '../../lib/console';

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
  });
});
