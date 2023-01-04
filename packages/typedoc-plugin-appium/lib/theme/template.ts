/**
 * Handlebars template & partial helpers
 * @module
 */

import Handlebars from 'handlebars';
import _ from 'lodash';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Path to resources directory, containing all templates and partials.
 */
const RESOURCES_PATH = path.join(__dirname, 'resources');

/**
 * Path to templates directory within {@linkcode RESOURCES_PATH}
 */
const TEMPLATE_PATH = path.join(RESOURCES_PATH, 'templates');

/**
 * Path to partials directory within {@linkcode RESOURCES_PATH}
 */
const PARTIALS_PATH = path.join(RESOURCES_PATH, 'partials');

/**
 * Enum of all available partials
 */
enum AppiumThemePartial {
  command = 'command.hbs',
  executeMethod = 'execute-method.hbs',
}

/**
 * Enum of all available templates
 */
export enum AppiumThemeTemplate {
  /**
   * Template to render a list of commands
   */
  Extension = 'extension.hbs',
}

/**
 * Registers all partials found in {@linkcode PARTIALS_PATH} with {@linkcode Handlebars}.
 *
 * This is executed immediately upon loading this module.
 */
function registerPartials() {
  for (const [name, filename] of Object.entries(AppiumThemePartial)) {
    Handlebars.registerPartial(name, fs.readFileSync(path.join(PARTIALS_PATH, filename), 'utf8'));
  }
}

registerPartials();

/**
 * Compiles a {@linkcode AppiumThemeTemplate}.
 */
export const compileTemplate = _.memoize((template: AppiumThemeTemplate) => {
  const templatePath = path.join(TEMPLATE_PATH, template);
  return Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
});
