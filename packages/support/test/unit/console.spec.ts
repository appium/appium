import {expect} from 'chai';
import {afterEach, describe, it} from 'node:test';
import * as consoleModule from '../../lib/console';

const {CliConsole, stripColors, styleText} = consoleModule;

describe('console', function () {
  it('should expose styleText and stripColors on the module namespace', function () {
    expect(consoleModule.styleText).to.equal(styleText);
    expect(consoleModule.stripColors).to.equal(stripColors);
  });

  describe('styleText()', function () {
    it('should accept grey as an alias for gray', function () {
      expect(stripColors(styleText('grey', 'muted'))).to.equal('muted');
    });

    it('should strip ANSI sequences from styled text', function () {
      expect(stripColors(styleText('red', 'error'))).to.equal('error');
    });

    it('should leave plain text unchanged when stripping', function () {
      expect(stripColors('plain')).to.equal('plain');
    });

    it('should strip non-SGR CSI sequences', function () {
      expect(stripColors('hello\x1b[2Kworld')).to.equal('helloworld');
      expect(stripColors('before\x1b[1Gafter')).to.equal('beforeafter');
    });
  });

  describe('CliConsole', function () {
    describe('decorate()', function () {
      it('should return undefined for undefined input', function () {
        const cli = new CliConsole();
        expect(cli.decorate(undefined, 'info')).to.be.undefined;
      });

      it('should return the message unchanged when symbols are disabled', function () {
        const cli = new CliConsole({useSymbols: false});
        expect(cli.decorate('hello', 'success')).to.equal('hello');
      });

      it('should prefix the message with a symbol', function () {
        const cli = new CliConsole({useColor: false});
        const decorated = cli.decorate('done', 'success');
        expect(decorated).to.match(/^.\s+done$/);
      });

      it('should colorize when useColor is enabled', function () {
        const cli = new CliConsole({useColor: true});
        const decorated = cli.decorate('done', 'success')!;
        expect(stripColors(decorated)).to.match(/^.\s+done$/);
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
          expect(decorated).to.equal(stripColors(decorated));
        });

        it('should not colorize when FORCE_COLOR is false regardless of case', function () {
          delete process.env.NO_COLOR;
          process.env.FORCE_COLOR = 'FALSE';
          const cli = new CliConsole();
          const decorated = cli.decorate('done', 'success')!;
          expect(decorated).to.equal(stripColors(decorated));
        });

        it('should colorize when FORCE_COLOR is set', function () {
          delete process.env.NO_COLOR;
          process.env.FORCE_COLOR = '1';
          const cli = new CliConsole({useColor: undefined});
          const decorated = cli.decorate('done', 'success')!;
          expect(stripColors(decorated)).to.match(/^.\s+done$/);
        });
      });
    });

    it('should map symbols to the expected colors', function () {
      expect(CliConsole.symbolToColor).to.eql({
        success: 'green',
        info: 'cyan',
        warning: 'yellow',
        error: 'red',
      });
    });
  });
});
