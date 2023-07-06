/**
 * Contains the {@link load entry point} for  `@appium/typedoc-plugin-appium`
 * @module
 */

import _ from 'lodash';
import {once} from 'node:events';
import pluralize from 'pluralize';
import {Application, type DeclarationReflection, type ProjectReflection} from 'typedoc';
import {
  convertCommands,
  createReflections,
  omitBuiltinReflections,
  omitDefaultReflections,
} from './converter';
import {AppiumPluginLogger, type AppiumPluginParentLogger} from './logger';
import {ExtensionReflection, NS, ProjectCommands} from './model';
import {configureOptions, declarations} from './options';
import type {PackageTitle} from './options/declarations';
import {THEME_NAME, configureTheme} from './theme';

let log: AppiumPluginLogger;

/**
 * Loads the Appium TypeDoc plugin.
 *
 * @param app - TypeDoc Application
 * @returns Unused by TypeDoc, but can be consumed programmatically.
 */
export function load(app: Application): void {
  // register our custom theme.  the user still has to choose it
  setup(app);

  convert(app);
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
  const [project] = (await once(app, Application.EVENT_PROJECT_REVIVE)) as [ProjectReflection];

  let removed: Set<DeclarationReflection> | undefined;
  let extensionReflections: ExtensionReflection[] | undefined;
  let projectCommands: ProjectCommands | undefined;
  const packageTitles = app.options.getValue('packageTitles') as PackageTitle[];

  // we don't want to do this work if we're not using the custom theme!
  log = log ?? new AppiumPluginLogger(app.logger, NS);

  // this should not be necessary given the `AppiumPluginOptionsReader` forces the issue, but
  // it's a safeguard nonetheless.
  if (app.renderer.themeName === THEME_NAME) {
    // this queries the declarations created by TypeDoc and extracts command information
    projectCommands = convertCommands(project, log);

    if (!projectCommands) {
      log.verbose('Skipping creation of reflections');
      return {project};
    }
    // this creates new custom reflections from the data we gathered and registers them
    // with TypeDoc
    extensionReflections = createReflections(project, log, projectCommands, packageTitles);
    ({removed} = postProcess(app, project));
  } else {
    log.warn(`Appium theme disabled!  Use "theme: 'appium'" in your typedoc.json`);
  }

  return {project, extensionReflections, projectCommands, removed};
}

/**
 * Resolved value of {@linkcode convert}
 */
export interface ConvertResult extends PostProcessResult {
  /**
   * Final project
   */
  project: ProjectReflection;
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
export function postProcess(app: Application, project: ProjectReflection): PostProcessResult {
  let removed: Set<DeclarationReflection> | undefined;
  // if the `outputModules` option is false, then we want to remove all the usual TypeDoc reflections.
  if (!app.options.getValue(declarations.outputModules.name)) {
    removed = omitDefaultReflections(project);
    log.info('%s omitted from output', pluralize('default reflection', removed.size, true));
  }
  if (!app.options.getValue(declarations.outputBuiltinCommands.name)) {
    const removedBuiltinRefls = omitBuiltinReflections(project);
    removed = new Set([...(removed ?? []), ...removedBuiltinRefls]);
    log.info(
      '%s omitted from output',
      pluralize('builtin reflection', removedBuiltinRefls.size, true)
    );
  }
  return {removed};
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
}

export * from './options';
export * from './theme';
export type {AppiumPluginLogger, AppiumPluginParentLogger};
