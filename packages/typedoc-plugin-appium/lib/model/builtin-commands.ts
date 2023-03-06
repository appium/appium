import _ from 'lodash';
import {ModuleCommands, ProjectCommands, RouteMap} from '.';
import {BaseDriverDeclarationReflection} from '../converter/types';

/**
 * This is essentially a {@linkcode ProjectCommands} object with zero or one entries.
 *
 * The entry is intended to be reflection for `@appium/base-driver and the associated
 * {@linkcode ModuleCommands} object.
 *
 * If no reflection is provided--even if the `RouteMap` is present--the result of
 * {@linkcode BuiltinCommands.toProjectCommands} will be empty (because there will be no key).
 */
export class BuiltinCommands {
  public readonly moduleCmds: ModuleCommands;

  /**
   * Note that since `@appium/base-driver` contains no execute methods, the `ModuleCommands` object
   * won't either.  If, in the future, `@appium/base-driver` contains execute methods, this constructor
   * will want to accept another argument _or_ just accept a `ModuleCommands` object in lieu of a
   * `RouteMap`/`ExecMethodDataSet`.
   * @param routeMap Builtin route map
   * @param refl `@appium/base-driver` `BaseDriverDeclarationReflection`
   */
  constructor(
    routeMap: RouteMap = new Map(),
    public readonly refl?: BaseDriverDeclarationReflection
  ) {
    this.moduleCmds = new ModuleCommands(routeMap);
  }

  /**
   * Converts this object to a {@linkcode ProjectCommands} object.
   *
   * Since the fields in this class are read-only, the contents of the `ProjectCommands` instance
   * will be invariant; thus we only need to create it once.
   * @returns A {@linkcode ProjectCommands} object with zero or one entry
   */
  public toProjectCommands = _.once(
    () => new ProjectCommands(this.refl ? [[this.refl.name, this.moduleCmds]] : [])
  );
}
