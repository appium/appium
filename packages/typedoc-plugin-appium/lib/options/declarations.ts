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
  },
  forceBreadcrumbs: {
    defaultValue: false,
    help: `(${NS}) Force breadcrumbs to be shown; overrides "hideBreadcrumbs"`,
    name: 'forceBreadcrumbs',
    type: ParameterType.Boolean,
  },
  outputBuiltinCommands: {
    defaultValue: false,
    help: `(${NS}) Output builtin commands`,
    name: 'outputBuiltinCommands',
    type: ParameterType.Boolean,
  },
  outputModules: {
    defaultValue: true,
    help: `(${NS}) Output modules APIs in addition to commands. This is needed for complete typing information`,
    name: 'outputModules',
    type: ParameterType.Boolean,
  },
} as const;

// these are extra type checks to ensure these are the correct type.
declarations.outputModules as DeclarationOption;
declarations.forceBreadcrumbs as DeclarationOption;
declarations.outputBuiltinCommands as DeclarationOption;
declarations.commandsDir as DeclarationOption;
