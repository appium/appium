import _ from 'lodash';
import {DeclarationOption, ParameterType} from 'typedoc';
import {NS} from '../model';

export type EntryPointTitleRecord = Record<string, string>;

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
  packageTitles: {
    defaultValue: [],
    help: `(${NS}) An array of objects with props "name" (module name) and "title" (display name)`,
    name: 'packageTitles',
    type: ParameterType.Mixed,
    validate(val: unknown) {
      if (!isPackageTitles(val)) {
        throw new Error(
          `Invalid value for "packageTitles" option; must be an array of objects with props "name" (module name) and "title" (display name): ${val}`
        );
      }
    },
  },
} as const;

export function isPackageTitle(value: any): value is PackageTitle {
  return _.isPlainObject(value) && _.isString(value.name) && _.isString(value.title);
}

export function isPackageTitles(value: any): value is PackageTitle[] {
  return _.isArray(value) && value.every(isPackageTitle);
}
export type PackageTitle = {name: string; title: string};

// type sanity check
declarations as Record<string, DeclarationOption>;
