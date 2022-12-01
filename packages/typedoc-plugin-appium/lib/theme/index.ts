import {ContainerReflection, PageEvent, ReflectionKind, Renderer} from 'typedoc';
import {MarkdownTheme} from 'typedoc-plugin-markdown';
import {AppiumPluginLogger} from '../logger';
import {AppiumPluginReflectionKind, NS} from '../model';
import {registerHelpers} from './helpers';
import {compileTemplate, AppiumThemeTemplate} from './template';

/**
 * Name of the theme; used at definition time
 */
export const THEME_NAME = 'appium';

export class AppiumTheme extends MarkdownTheme {
  /**
   * A template renderer for `CommandReflection`s
   */
  #commandsTemplateRenderer: TemplateRenderer;

  /**
   * Custom logger.  This is not the same as the one created by the plugin loader.
   */
  #log: AppiumPluginLogger;

  /**
   * Creates template renderers and registers all {@linkcode Handlebars} helpers.
   * @param renderer - TypeDoc renderer
   *
   * @todo Make `hideBreadcrumbs` configurable
   */
  constructor(renderer: Renderer) {
    super(renderer);

    // ideally, this would be a child of the logger created by the `load()` function,
    // but I don't know how to get at it.
    this.#log = new AppiumPluginLogger(renderer.owner.logger, `${NS}:theme`);

    this.#commandsTemplateRenderer = this.#createTemplateRenderer(AppiumThemeTemplate.Commands);

    // the intent is to have mkdocs render breadcrumbs
    this.hideBreadcrumbs = true;

    // this ensures we can overwrite MarkdownTheme's Handlebars helpers
    registerHelpers();
  }

  /**
   * This is essentially a lookup of {@linkcode ReflectionKind}s to templates.  It also controls in which directory the output files live.
   *
   * If `isLeaf` is `false`, the model gets its own document.
   */
  public override get mappings(): TemplateMapping[] {
    return [
      {
        kind: [AppiumPluginReflectionKind.COMMANDS as any],
        isLeaf: false,
        directory: 'commands',
        template: this.#commandsTemplateRenderer,
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
 * A mapping of {@linkcode ReflectionKind} to a template and other metadata.
 *
 * Defined by {@linkcode MarkdownTheme}.
 * @public
 */
export type TemplateMapping = {
  kind: ReflectionKind[];
  isLeaf: boolean;
  directory: string;
  template: (pageEvent: PageEvent<ContainerReflection>) => string;
};
