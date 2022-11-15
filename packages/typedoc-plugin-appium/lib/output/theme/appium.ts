import {ContainerReflection, PageEvent, Renderer} from 'typedoc';
import {MarkdownTheme} from 'typedoc-plugin-markdown';
import {AppiumPluginLogger} from '../../logger';
import {AppiumPluginReflectionKind} from '../../model';
import {compileTemplate, registerHelpers, Template} from './utils';

/**
 * Name of the theme; used at definition time
 */
export const THEME_NAME = 'appium';

/**
 * Factory for `AppiumTheme` class; needs custom logger otherwise inaccessible
 * @param log - Custom logger
 * @returns `AppiumTheme` class
 */
export function getTheme(log: AppiumPluginLogger): new (renderer: Renderer) => MarkdownTheme {
  return class AppiumTheme extends MarkdownTheme {
    #log = log.createChildLogger('theme');

    #commandsTemplateRenderer: TemplateRenderer;

    constructor(renderer: Renderer) {
      super(renderer);

      this.#commandsTemplateRenderer = this.#getTemplate(Template.Commands);
      // this ensures we overwrite what MarkdownTheme does
      registerHelpers();
    }

    public override get mappings() {
      return [
        {
          kind: [AppiumPluginReflectionKind.COMMANDS as any],
          isLeaf: true,
          directory: 'commands',
          template: this.#commandsTemplateRenderer,
        },
        ...super.mappings,
      ];
    }

    #getTemplate(template: Template): TemplateRenderer {
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
  };
}

type TemplateRenderer = (pageEvent: PageEvent<ContainerReflection>) => string;
