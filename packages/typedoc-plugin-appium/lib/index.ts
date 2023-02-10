/**
 * Contains the {@link load entry point} for  `@appium/typedoc-plugin-appium`
 * @module
 */

import _ from 'lodash';
import pluralize from 'pluralize';
import {Application, Context, Converter, DeclarationReflection} from 'typedoc';
import {
  convertCommands,
  createReflections,
  omitBuiltinReflections,
  omitDefaultReflections,
} from './converter';
import {AppiumPluginLogger, AppiumPluginParentLogger} from './logger';
import {ExtensionReflection, NS, ProjectCommands} from './model';
import {configureOptions, declarations} from './options';
import {configureTheme, THEME_NAME} from './theme';

let log: AppiumPluginLogger;

/**
 * Loads the Appium TypeDoc plugin.
 *
 * @param app - TypeDoc Application
 * @returns Unused by TypeDoc, but can be consumed programmatically.
 */
export function load(
  app: Application
): Promise<[PromiseSettledResult<ConvertResult>, PromiseSettledResult<PostProcessResult>]> {
  // register our custom theme.  the user still has to choose it
  setup(app);

  // TypeDoc does not expect a return value here, but it's useful for testing.
  // note that this runs both methods "in parallel", but the `convert` method will always resolve
  // first, and `postProcess` won't do any real work until that happens.
  return Promise.allSettled([convert(app), postProcess(app)]);
}

/**
 * Registers theme and options, then monkeys with the options
 */
export const setup: (app: Application) => Application = _.flow(configureTheme, configureOptions);

/**
 * Finds commands and creates new reflections for them, adding them to the project.
 *
 * Resolves after {@linkcode Converter.EVENT_RESOLVE_END} emits and when it's finished.
 * @param app Typedoc Application
 * @returns A {@linkcode ConvertResult} receipt from the conversion
 */
export async function convert(app: Application): Promise<ConvertResult> {
  return new Promise((resolve) => {
    app.converter.once(
      Converter.EVENT_RESOLVE_END,
      /**
       * This listener _must_ trigger on {@linkcode Converter.EVENT_RESOLVE_END}, because TypeDoc's
       * internal plugins do some post-processing on the project's reflections--specifically, it
       * finds `@param` tags in a `SignatureReflection`'s `comment` and "moves" them into the
       * appropriate `ParameterReflections`.  Without this in place, we won't be able aggregate
       * parameter comments and they will not display in the generated docs.
       */
      (ctx: Context) => {
        let extensionReflections: ExtensionReflection[] | undefined;
        let projectCommands: ProjectCommands | undefined;

        // we don't want to do this work if we're not using the custom theme!
        log = log ?? new AppiumPluginLogger(app.logger, NS);

        // this should not be necessary given the `AppiumPluginOptionsReader` forces the issue, but
        // it's a safeguard nonetheless.
        if (app.renderer.themeName === THEME_NAME) {
          // this queries the declarations created by TypeDoc and extracts command information
          projectCommands = convertCommands(ctx, log);

          if (!projectCommands) {
            log.verbose('Skipping creation of reflections');
            resolve({ctx});
            return;
          }
          // this creates new custom reflections from the data we gathered and registers them
          // with TypeDoc
          extensionReflections = createReflections(ctx, log, projectCommands);
        } else {
          log.warn(`Appium theme disabled!  Use "theme: 'appium'" in your typedoc.json`);
        }
        resolve({ctx, extensionReflections, projectCommands});
      }
    );
  });
}

/**
 * Resolved value of {@linkcode convert}
 */
export interface ConvertResult {
  /**
   * Context at time of {@linkcode Context.EVENT_RESOLVE_END}
   */
  ctx: Context;
  /**
   * Raw data structure containing everything about commands in the project
   */
  projectCommands?: ProjectCommands;
  /**
   * List of custom reflections created by the plugin
   */
  extensionReflections?: ExtensionReflection[];
}

/**
 * Optionally omits the default TypeDoc reflections from the project based on the `outputModules` option.
 *
 * Resolves after {@linkcode Converter.EVENT_RESOLVE_END} emits and when it's finished.
 * @param app Typedoc application
 * @returns Typedoc `Context` at the time of the {@linkcode Converter.EVENT_RESOLVE_END} event
 */
export async function postProcess(app: Application): Promise<PostProcessResult> {
  log = log ?? new AppiumPluginLogger(app.logger, NS);
  return new Promise((resolve) => {
    app.converter.once(Converter.EVENT_RESOLVE_END, (ctx: Context) => {
      let removed: Set<DeclarationReflection> | undefined;
      // if the `outputModules` option is false, then we want to remove all the usual TypeDoc reflections.
      if (!app.options.getValue(declarations.outputModules.name)) {
        removed = omitDefaultReflections(ctx.project);
        log.info('%s omitted from output', pluralize('default reflection', removed.size, true));
      }
      if (!app.options.getValue(declarations.outputBuiltinCommands.name)) {
        const removedBuiltinRefls = omitBuiltinReflections(ctx.project);
        removed = new Set([...(removed ?? []), ...removedBuiltinRefls]);
        log.info(
          '%s omitted from output',
          pluralize('builtin reflection', removedBuiltinRefls.size, true)
        );
      }
      resolve({ctx, removed});
    });
  });
}

/**
 * Result of {@linkcode postProcess}
 */
export interface PostProcessResult {
  /**
   * A list of {@linkcode DeclarationReflection DeclarationReflections} which were removed from the
   * project, if any.
   */
  removed?: Set<DeclarationReflection>;
  /**
   * Context at time of {@linkcode Context.EVENT_RESOLVE_END}
   */
  ctx: Context;
}

export * from './options';
export * from './theme';
export type {AppiumPluginLogger, AppiumPluginParentLogger};
