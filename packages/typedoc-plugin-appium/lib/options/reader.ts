import _ from 'lodash';
import path from 'node:path';
import {EntryPointStrategy, Options, OptionsReader} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {THEME_NAME} from '../theme';
import {PackageTitle} from './declarations';

/**
 * List of theme names to override.
 *
 * `default` is what happens if the user does not specify a theme. The markdown plugin,
 * if loaded, will overwrite `default` with `markdown`, so we'll have to overwrite it again.
 *
 * @internal
 */
const OVERRIDE_THEME_NAMES: Readonly<Set<string>> = new Set(['default', 'markdown']);

/**
 * These packages must be resolvable for the plugin to work at all.
 * @internal
 */
const REQUIRED_PACKAGES: Readonly<Set<string>> = new Set(['@appium/base-driver', '@appium/types']);

/**
 * This befouls the options.
 *
 * It can do what has been undone and undo what has been done. It can make real your dreams... or nightmares.
 */
export class AppiumPluginOptionsReader implements OptionsReader {
  readonly #log: AppiumPluginLogger;

  /**
   * I don't know the point of `name`, but the interface requires it, so here.
   */
  public readonly name = 'naughty-appium-options-reader';
  /**
   * This needs to be higher than the value in `MarkdownOptionsReader`.
   */
  public readonly priority = 2000;

  constructor(logger: AppiumPluginLogger) {
    this.#log = logger.createChildLogger('options-reader');
  }

  /**
   * Attempts to derive a title (for use in theme output) from a package's `package.json` if that package is an Appium extension
   * @param pkgJsonPath Path to a `package.json`
   */
  public static getTitleFromPackageJson(pkgJsonPath: string): string | undefined {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require(pkgJsonPath);
      return pkg?.appium?.driverName ?? pkg?.appium?.pluginName;
    } catch {
      // ignored
    }
  }

  /**
   * Calls various private methods to override option values or provide defaults.
   * @param container - Options container
   */
  public read(container: Options) {
    this.#configureTheme(container);
    this.#configureEntryPointStrategy(container);
    this.#configureEntryPoints(container);
    this.#configurePackages(container);
  }

  /**
   * Forces the `entryPointStrategy` option to be {@linkcode EntryPointStrategy.Packages}
   * @param container Options
   */
  #configureEntryPointStrategy(container: Options) {
    const entryPointStrategy = container.getValue('entryPointStrategy');
    if (entryPointStrategy !== EntryPointStrategy.Packages) {
      container.setValue('entryPointStrategy', EntryPointStrategy.Packages);
      this.#log.verbose('Set option "entryPointStrategy" to "%s"', EntryPointStrategy.Packages);
    }
  }

  /**
   * Adds required packages to the `entryPoints` option.
   *
   * If the `entryPoints` option already contains something that _looks like_ a
   * {@linkcode REQUIRED_PACKAGES required package}, then it is validated via
   * `require.resolve`. If this fails, it is replaced with the proper package path.
   *
   * If a required package cannot be resolved, an error occurs
   * @param container Options
   */
  #configureEntryPoints(container: Options) {
    let entryPoints = container.getValue('entryPoints');
    const newEntryPoints = new Set(entryPoints);

    const addEntryPoint = (entryPoint: string) => {
      try {
        const entryPointPath = path.dirname(require.resolve(`${entryPoint}/package.json`));
        newEntryPoints.add(entryPointPath);
        this.#log.verbose('Added %s to "entryPoint" option', entryPointPath);
      } catch (err) {
        this.#log.error('Could not find required package "%s"', entryPoint);
      }
    };

    for (const reqdEntryPoint of REQUIRED_PACKAGES) {
      const foundReqdEP = entryPoints.find((entryPoint) => entryPoint.includes(reqdEntryPoint));
      if (foundReqdEP) {
        try {
          require.resolve(foundReqdEP);
          this.#log.verbose('entryPoint %s already exists (%s)', reqdEntryPoint, foundReqdEP);
        } catch {
          newEntryPoints.delete(foundReqdEP);
          addEntryPoint(reqdEntryPoint);
          this.#log.warn(
            '"entryPoint" option item matching required package "%s" is invalid or missing (%s); it was replaced',
            reqdEntryPoint,
            foundReqdEP
          );
        }
      } else {
        addEntryPoint(reqdEntryPoint);
      }
    }

    entryPoints = [...newEntryPoints];
    container.setValue('entryPoints', entryPoints);
    this.#log.verbose('Final value of "entryPoints" option: %O', entryPoints);
  }

  #configurePackages(container: Options) {
    let pkgTitles = container.getValue('packageTitles') as PackageTitle[];
    const entryPoints = container.getValue('entryPoints');

    const newPkgTitles: PackageTitle[] = [];

    for (const entryPoint of entryPoints) {
      const pkgJsonPath = require.resolve(`${entryPoint}/package.json`);
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require(pkgJsonPath);
        const {name} = pkg;
        let title: string | undefined;
        if (pkg.appium?.driverName) {
          title = `Driver: ${pkg.appium.driverName}`;
        } else if (pkg.appium?.pluginName) {
          title = `Plugin: ${pkg.appium.pluginName}`;
        }

        if (title && !_.find(pkgTitles, {name})) {
          newPkgTitles.push({name, title});
        }
      } catch {
        this.#log.warn('Could not resolve package.json for %s', entryPoint);
      }
    }

    pkgTitles = [...pkgTitles, ...newPkgTitles];
    container.setValue('packageTitles', pkgTitles);
    this.#log.verbose('Final value of "packageTitles" option: %O', pkgTitles);
  }

  /**
   * Forces the theme to be {@linkcode THEME_NAME}
   * @param container Options
   */
  #configureTheme(container: Options) {
    if (OVERRIDE_THEME_NAMES.has(container.getValue('theme'))) {
      container.setValue('theme', THEME_NAME);
      this.#log.verbose('Set option "theme" to "appium"');
    }
  }
}
