import _ from 'lodash';
import {
  Application,
  ContainerReflection,
  PageEvent,
  Reflection,
  ReflectionKind,
  Renderer,
} from 'typedoc';
import {MarkdownTheme} from 'typedoc-plugin-markdown';
import {AppiumPluginLogger} from '../logger';
import {AppiumPluginReflectionKind, NS} from '../model';
import {AppiumPluginOptions, declarations} from '../options';
import {registerHelpers} from './helpers';
import {AppiumThemeTemplate, compileTemplate} from './template';

/**
 * Name of the theme; used at definition time
 */
export const THEME_NAME = 'appium';

/**
 * This theme uses everything from `MarkdownTheme` and adds a new section for commands.
 */
export class AppiumTheme extends MarkdownTheme {
  /**
   * A template renderer for `CommandReflection`s
   */
  #extensionTemplateRenderer: TemplateRenderer;
  /**
   * Custom logger.  This is not the same as the one created by the plugin loader.
   */
  #log: AppiumPluginLogger;

  /**
   * Options specific to this plugin
   */
  #opts: AppiumPluginOptions;

  /**
   * Creates template renderers and registers all {@linkcode Handlebars} helpers.
   * @param renderer - TypeDoc renderer
   *
   * @todo Use declaration merging to add an instance of `AppiumPluginLogger` to `Application`,
   * which we can then reference here.
   */
  constructor(renderer: Renderer) {
    super(renderer);

    this.#log = new AppiumPluginLogger(renderer.owner.logger, `${NS}:theme`);

    this.#extensionTemplateRenderer = this.#createTemplateRenderer(AppiumThemeTemplate.Extension);

    this.#opts = _.fromPairs(
      Object.keys(declarations).map((name) => [[name, this.application.options.getValue(name)]])
    ) as AppiumPluginOptions;

    /**
     * We do not want to show breadcrumbs by default, but `MarkdownTheme` does.  We cannot override
     * default value of the `hideBreadcrumbs` option, but we can add a new one, which is what we've done;
     * if the `forceBreadcrumbs` option is not truthy, then we will hide breadcrumbs.
     */
    this.hideBreadcrumbs = !this.#opts.forceBreadcrumbs;

    // this ensures we can overwrite MarkdownTheme's Handlebars helpers
    registerHelpers();
  }

  /**
   * Special-cases `ExtensionReflection` instances to make the filename shorter and thus better
   * suitable for `mkdocs`.
   * @param reflection Reflection to get URL for
   * @returns String URL
   */
  public override getUrl(reflection: Reflection) {
    if (reflection.kindOf(AppiumPluginReflectionKind.Extension as any)) {
      // I don't know what this replace is for, but the superclass does it, so maybe it's important.
      return reflection.getAlias().replace('^_', '');
    }
    return super.getUrl(reflection);
  }

  /**
  /**
   * A lookup of {@linkcode ReflectionKind}s to templates.  It also controls in which directory the output files live.
   *
   * This is part of {@linkcode MarkdownTheme} and adds a new template.
   *
   * If `isLeaf` is `false`, the model gets its own document.
   */
  public override get mappings(): TemplateMapping[] {
    return [
      {
        kind: [AppiumPluginReflectionKind.Extension as any],
        isLeaf: false,
        directory: this.application.options.getValue(declarations.commandsDir.name) as string,
        template: this.#extensionTemplateRenderer,
      },
      ...super.mappings,
    ];
  }

  /**
   * Given a {@linkcode AppiumThemeTemplate} return a function which will render the template
   * given some data.
   * @param template Template to render
   * @returns Rendering function
   */
  #createTemplateRenderer(template: AppiumThemeTemplate): TemplateRenderer {
    const render = compileTemplate(template);
    return (pageEvent: PageEvent<ContainerReflection>) => {
      this.#log.verbose('Rendering template for model %s', pageEvent.model.name);
      return render(pageEvent, {
        allowProtoMethodsByDefault: true,
        allowProtoPropertiesByDefault: true,
        data: {theme: this},
      });
    };
  }
}

/**
 * A function which accepts {@linkcode PageEvent} as its model and returns the final markdown.
 */
export type TemplateRenderer = (pageEvent: PageEvent<ContainerReflection>) => string;

/**
 * A mapping of `ReflectionKind` to a template and other metadata.
 *
 * Defined by `MarkdownTheme`.
 */
export type TemplateMapping = {
  kind: ReflectionKind[];
  isLeaf: boolean;
  directory: string;
  template: (pageEvent: PageEvent<ContainerReflection>) => string;
};

export type {AppiumThemeTemplate};

/**
 * Registers {@linkcode AppiumTheme} with TypeDoc.
 * @param app TypeDoc application
 */
export function configureTheme(app: Application): Application {
  app.renderer.defineTheme(THEME_NAME, AppiumTheme);
  return app;
}
