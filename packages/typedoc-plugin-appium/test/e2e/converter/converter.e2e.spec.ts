import {createSandbox, SinonSandbox} from 'sinon';
import {Context, Converter} from 'typedoc';
import {
  convertCommands,
  NAME_BUILTIN_COMMAND_MODULE,
  NAME_TYPES_MODULE,
} from '../../../lib/converter';
import {AppiumPluginLogger} from '../../../lib/logger';
import {ProjectCommands} from '../../../lib/model';
import {initAppForPkgs, NAME_FAKE_DRIVER_MODULE} from '../helpers';

const {expect} = chai;

describe('@appium/typedoc-plugin-appium', function () {
  describe('convertCommands()', function () {
    let sandbox: SinonSandbox;
    beforeEach(function () {
      sandbox = createSandbox();
    });

    afterEach(function () {
      sandbox.restore();
    });
    let ctx: Context;
    let log: AppiumPluginLogger;
    before(async function () {
      const app = initAppForPkgs({
        entryPoints: [NAME_TYPES_MODULE, NAME_FAKE_DRIVER_MODULE, NAME_BUILTIN_COMMAND_MODULE],
      });
      ctx = await new Promise((resolve) => {
        app.converter.once(Converter.EVENT_RESOLVE_END, (ctx: Context) => {
          resolve(ctx);
        });
        app.convert();
      });
      log = new AppiumPluginLogger(app.logger, 'appium-test');
    });

    describe('convertCommands()', function () {
      it('should return a non-empty ProjectCommands Map', () => {
        expect(convertCommands(ctx, log)).to.be.an.instanceof(ProjectCommands).and.not.to.be.empty;
      });
    });
  });
});
