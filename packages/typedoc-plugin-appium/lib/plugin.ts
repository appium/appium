import {Application, Context, Converter} from 'typedoc';
import {convertCommands, createReflections} from './converter';
import {AppiumPluginLogger} from './logger';
import {getTheme, THEME_NAME} from './output';

/**
 * Loads the Appium TypeDoc plugin
 * @param app - TypeDoc Application
 */
export function load(app: Application) {
  const log = new AppiumPluginLogger(app.logger, 'appium');

  // register our custom theme.  the user still has to choose it
  app.renderer.defineTheme(THEME_NAME, getTheme(log));

  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
    // we don't want to do this work if we're not using the custom theme!
    if (app.renderer.themeName === THEME_NAME) {
      // this queries the declarations created by TypeDoc and extracts command information
      const projectCommands = convertCommands(ctx, log);

      // this creates new custom reflections from the data we gathered and registers them
      // with TypeDoc
      createReflections(ctx, log, projectCommands);
    }
  });
}
