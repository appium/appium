import {Application, Context, Converter, DeclarationReflection} from 'typedoc';
import {convertCommands, createReflections, omitDefaultReflections} from './converter';
import {AppiumPluginLogger, AppiumPluginParentLogger} from './logger';
import {ExtensionReflection, NS, ProjectCommands} from './model';
import {configureOptions, declarations} from './options';
import {AppiumTheme, THEME_NAME} from './theme';

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
  app.renderer.defineTheme(THEME_NAME, AppiumTheme);

  configureOptions(app);

  return Promise.allSettled([convert(app), postProcess(app)]);
}

/**
 * Finds commands and creates new reflections for them, adding them to the project.
 *
 * Resolves after {@linkcode Converter.EVENT_RESOLVE_BEGIN} emits and when it's finished.
 * @param app Typedoc Application
 * @returns A {@linkcode ConvertResult} receipt from the conversion
 */
export async function convert(app: Application): Promise<ConvertResult> {
  return new Promise((resolve) => {
    app.converter.once(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
      let extensionReflections: ExtensionReflection[] | undefined;
      let projectCommands: ProjectCommands | undefined;

      // we don't want to do this work if we're not using the custom theme!
      const log = new AppiumPluginLogger(app.logger, NS);

      // this should not be necessary given the `AppiumPluginOptionsReader` forces the issue, but
      // it's a safeguard nonetheless.
      if (app.renderer.themeName === THEME_NAME) {
        // this queries the declarations created by TypeDoc and extracts command information
        projectCommands = convertCommands(ctx, log);

        // this creates new custom reflections from the data we gathered and registers them
        // with TypeDoc
        extensionReflections = createReflections(ctx, log, projectCommands);
      } else {
        log.warn('Not using the Appium theme; skipping command reflection creation');
      }
      resolve({ctx, extensionReflections, projectCommands});
    });
  });
}

/**
 * Resolved value of {@linkcode convert}
 */
export interface ConvertResult {
  /**
   * Context at time of {@linkcode Context.EVENT_RESOLVE_BEGIN}
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
  return new Promise((resolve) => {
    app.converter.once(Converter.EVENT_RESOLVE_END, (ctx: Context) => {
      let removed: Set<DeclarationReflection> | undefined;
      // if the `outputModules` option is false, then we want to remove all the usual TypeDoc reflections.
      if (!app.options.getValue(declarations.outputModules.name)) {
        removed = omitDefaultReflections(ctx.project);
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
