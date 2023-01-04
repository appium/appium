import {DeclarationOption, ParameterType} from 'typedoc';
import {NS} from '../model';

/**
 * List of options for the plugin
 * @internal
 */
export const declarations = {
  commandsDir: {
    defaultValue: 'commands',
    help: `(${NS}) Name of "commands" directory under the TypeDoc output directory. Not a full path`,
    name: 'commandsDir',
    type: ParameterType.String,
  } as DeclarationOption,
  forceBreadcrumbs: {
    defaultValue: false,
    help: `(${NS}) Force breadcrumbs to be shown; overrides "hideBreadcrumbs"`,
    name: 'forceBreadcrumbs',
    type: ParameterType.Boolean,
  } as DeclarationOption,
  outputBuiltinCommands: {
    defaultValue: false,
    help: `(${NS}) Output builtin commands`,
    name: 'outputBuiltinCommands',
    type: ParameterType.Boolean,
  } as DeclarationOption,
  outputModules: {
    defaultValue: true,
    help: `(${NS}) Output modules APIs in addition to commands. This is needed for complete typing information`,
    name: 'outputModules',
    type: ParameterType.Boolean,
  } as DeclarationOption,
} as const;
