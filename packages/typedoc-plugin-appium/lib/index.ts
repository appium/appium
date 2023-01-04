import {Application, Context, Converter} from 'typedoc';
import {convertCommands, createReflections, omitDefaultReflections} from './converter';
import {AppiumPluginLogger, AppiumPluginParentLogger} from './logger';
import {NS} from './model';
import {configureOptions, declarations} from './options';
import {AppiumTheme, THEME_NAME} from './theme';

/**
 * Loads the Appium TypeDoc plugin
 * @param app - TypeDoc Application
 */
export function load(app: Application) {
  // register our custom theme.  the user still has to choose it
  app.renderer.defineTheme(THEME_NAME, AppiumTheme);

  configureOptions(app);

  app.converter
    .on(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
      // we don't want to do this work if we're not using the custom theme!
      const log = new AppiumPluginLogger(app.logger, NS);

      // this should not be necessary given the `AppiumPluginOptionsReader` forces the issue, but
      // it's a safeguard nonetheless.
      if (app.renderer.themeName === THEME_NAME) {
        // this queries the declarations created by TypeDoc and extracts command information
        const moduleCommands = convertCommands(ctx, log);

        // this creates new custom reflections from the data we gathered and registers them
        // with TypeDoc
        createReflections(ctx, log, moduleCommands);
      } else {
        log.warn('Not using the Appium theme; skipping command reflection creation');
      }
    })
    .on(Converter.EVENT_RESOLVE_END, (ctx: Context) => {
      // if the `outputModules` option is false, then we want to remove all the usual TypeDoc reflections.
      if (!app.options.getValue(declarations.outputModules.name)) {
        omitDefaultReflections(ctx.project);
      }
    });
}

export * from './options';
export * from './theme';
export type {AppiumPluginLogger, AppiumPluginParentLogger};
