import {Application, ParameterType} from 'typedoc';
import {AppiumPluginOptionsReader} from './reader';
import {declarations} from './declarations';
import {AppiumPluginLogger} from '../logger';

export * from './reader';
export {declarations};

/**
 * Configures how this plugin handles TypeDoc options.
 * @param app TypeDoc Application
 */
export function configureOptions(app: Application): Application {
  const log = new AppiumPluginLogger(app.logger, 'options');

  // for evil
  app.options.addReader(new AppiumPluginOptionsReader(log));

  // add our custom options
  for (const declaration of Object.values(declarations)) {
    app.options.addDeclaration(declaration);
  }
  return app;
}

export type AppiumPluginOptions = {
  [O in keyof typeof declarations]: (typeof declarations)[O]['type'] extends ParameterType.Boolean
    ? boolean
    : (typeof declarations)[O]['type'] extends ParameterType.String
    ? string
    : unknown;
};
