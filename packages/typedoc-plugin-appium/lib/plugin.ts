import {Application, Context, Converter} from 'typedoc';
import {convertCommands, createReflections, stats} from './converter';
import {AppiumPluginLogger, AppiumPluginParentLogger} from './logger';
import {AppiumTheme, THEME_NAME} from './theme';

/**
 * Loads the Appium TypeDoc plugin
 * @param app - TypeDoc Application
 */
export function load(app: Application) {
  // register our custom theme.  the user still has to choose it
  app.renderer.defineTheme(THEME_NAME, AppiumTheme);

  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
    // we don't want to do this work if we're not using the custom theme!
    const log = new AppiumPluginLogger(app.logger, 'appium');

    // note: THEME_NAME is flimsy, but we cannot use instanceof due to the AppiumTheme closure
    if (app.renderer.themeName === THEME_NAME) {
      // this queries the declarations created by TypeDoc and extracts command information
      const moduleCommands = convertCommands(ctx, log);

      // this creates new custom reflections from the data we gathered and registers them
      // with TypeDoc
      createReflections(ctx, log, moduleCommands);

      log.info(`${stats}`);
    } else {
      log.warn('Not using the Appium theme; skipping command reflection creation');
    }
  });
}

export * from './theme';
export type {AppiumPluginLogger, AppiumPluginParentLogger};
