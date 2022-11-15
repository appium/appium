import {RenderTemplate, RendererEvent, Theme} from 'typedoc';
import {CommandReflection} from '../../model';

export type RenderCommandLinkProps = {page: CommandReflection; label?: string};
export interface IAppiumPluginThemeMethods {
  renderPageLink: RenderTemplate<RenderCommandLinkProps>;
}
export interface IAppiumPluginTheme extends Theme {
  appiumPlugin(event: RendererEvent): IAppiumPluginThemeMethods;
}

export function isAppiumPluginTheme(theme: Theme): theme is IAppiumPluginTheme {
  return 'appiumPlugin' in theme;
}
