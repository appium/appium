import _ from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import {ContainerReflection, PageEvent, ReflectionKind} from 'typedoc';
import {AppiumPluginReflectionKind} from '../../model';

const RESOURCES_PATH = path.join(__dirname, '..', '..', '..', 'resources');
const TEMPLATE_PATH = path.join(RESOURCES_PATH, 'templates');
const PARTIALS_PATH = path.join(RESOURCES_PATH, 'partials');

const Partials = {
  command: 'command.hbs',
  executeCommand: 'execute-command.hbs',
} as const;

function registerPartials() {
  for (const [name, filename] of Object.entries(Partials)) {
    Handlebars.registerPartial(name, fs.readFileSync(path.join(PARTIALS_PATH, filename), 'utf8'));
  }
}

registerPartials();

export enum Template {
  Commands = 'commands.hbs',
}

export const compileTemplate = _.memoize((template: Template) => {
  const templatePath = path.join(TEMPLATE_PATH, template);
  return Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
});

export function registerHelpers() {
  Handlebars.registerHelper('reflectionPath', function (this: PageEvent<ContainerReflection>) {
    if (this.model) {
      if (this.model.kind && this.model.kind !== ReflectionKind.Module) {
        if (this.model.kind === (AppiumPluginReflectionKind.COMMANDS as any)) {
          return `${this.model.name} Commands`;
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
  });
}
