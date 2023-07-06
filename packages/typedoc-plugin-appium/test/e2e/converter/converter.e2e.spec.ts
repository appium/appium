import {createSandbox, SinonSandbox} from 'sinon';
import {Application, ProjectReflection} from 'typedoc';
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
    let project: ProjectReflection;
    let log: AppiumPluginLogger;
    before(async function () {
      const app = initAppForPkgs({
        entryPoints: [NAME_TYPES_MODULE, NAME_FAKE_DRIVER_MODULE, NAME_BUILTIN_COMMAND_MODULE],
      });
      project = await new Promise((resolve) => {
        app.once(Application.EVENT_PROJECT_REVIVE, (project: ProjectReflection) => {
          resolve(project);
        });
        app.convert();
      });
      log = new AppiumPluginLogger(app.logger, 'appium-test');
    });

    describe('convertCommands()', function () {
      it('should return a non-empty ProjectCommands Map', function () {
        expect(convertCommands(project, log)).to.be.an.instanceof(ProjectCommands).and.not.to.be
          .empty;
      });
    });
  });
});
