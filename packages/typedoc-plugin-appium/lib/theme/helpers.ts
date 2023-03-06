/**
 * Custom Handlebars helpers
 * @module
 */

import Handlebars from 'handlebars';
import {PageEvent, ContainerReflection, ReflectionKind} from 'typedoc';
import {AppiumPluginReflectionKind} from '../model';
import plural from 'pluralize';

/**
 * Overwrites {@linkcode typedoc-plugin-markdown#MarkdownTheme}'s `reflectionPath` helper to handle {@linkcode AppiumPluginReflectionKind} reflection kinds
 * @param this Page event
 * @returns Reflection path, if any
 */
function reflectionPath(this: PageEvent<ContainerReflection>) {
  if (this.model) {
    if (this.model.kind && this.model.kind !== ReflectionKind.Module) {
      if (this.model.kind === (AppiumPluginReflectionKind.Driver as any)) {
        return `${this.model.name} Driver`;
      } else if (this.model.kind === (AppiumPluginReflectionKind.Plugin as any)) {
        return `${this.model.name} Plugin`;
      }
      const title: string[] = [];
      if (this.model.parent && this.model.parent.parent) {
        if (this.model.parent.parent.parent) {
          title.push(
            `[${this.model.parent.parent.name}](${Handlebars.helpers.relativeURL(
              this.model?.parent?.parent.url
            )})`
          );
        }
        title.push(
          `[${this.model.parent.name}](${Handlebars.helpers.relativeURL(this.model.parent.url)})`
        );
      }
      title.push(this.model.name);
      return title.length > 1 ? `${title.join('.')}` : null;
    }
  }
  return null;
}

/**
 * Helper to "pluralize" a string.
 * @param value String to pluralize
 * @param count Number of items to consider
 * @param inclusive Whether to show the count in the output
 * @returns The pluralized string (if necessary)
 */
function pluralize(value: string, count: number, inclusive = false) {
  const safeValue = Handlebars.escapeExpression(value);
  // XXX: Handlebars seems to be passing in a truthy value here, even if the arg is unused in the template! Make double-sure it's a boolean.
  inclusive = inclusive === true;
  const pluralValue = plural(safeValue, count, inclusive);
  return new Handlebars.SafeString(pluralValue);
}

/**
 * Registers all custom helpers with Handlebars
 */
export function registerHelpers() {
  Handlebars.registerHelper('reflectionPath', reflectionPath);
  Handlebars.registerHelper('pluralize', pluralize);
}
