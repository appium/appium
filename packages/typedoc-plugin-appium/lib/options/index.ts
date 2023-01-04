import {Application, ParameterType} from 'typedoc';
import {AppiumPluginOptionsReader} from './reader';
import {declarations} from './declarations';

export * from './reader';
export {declarations};

/**
 * Configures how this plugin handles TypeDoc options.
 * @param app TypeDoc Application
 */
export function configureOptions(app: Application) {
  // for evil
  app.options.addReader(new AppiumPluginOptionsReader());

  // add our custom options
  for (const declaration of Object.values(declarations)) {
    app.options.addDeclaration(declaration);
  }
}

export type AppiumPluginOptions = {
  [O in keyof typeof declarations]: typeof declarations[O]['type'] extends ParameterType.Boolean
    ? boolean
    : typeof declarations[O]['type'] extends ParameterType.String
    ? string
    : unknown;
};
