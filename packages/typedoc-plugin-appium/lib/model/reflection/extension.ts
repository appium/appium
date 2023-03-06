import _ from 'lodash';
import {DeclarationReflection, ProjectReflection} from 'typedoc';
import {NAME_BUILTIN_COMMAND_MODULE} from '../../converter';
import {ModuleCommands} from '../module-commands';
import {ExecMethodDataSet, ParentReflection, RouteMap} from '../types';
import {AppiumPluginReflectionKind} from './kind';

const SCOPED_PACKAGE_NAME_REGEX = /^(@[^/]+)\/([^/]+)$/;

/**
 * A reflection containing data about commands and/or execute methods.
 *
 * Methods may be invoked directly by Handlebars templates.
 */
export class ExtensionReflection extends DeclarationReflection {
  /**
   * Info about execute methods
   */
  public readonly execMethodDataSet: ExecMethodDataSet;
  /**
   * Info about routes/commands
   */
  public readonly routeMap: RouteMap;

  public override hasOwnDocument = true;

  /**
   * Cached value of {@linkcode ExtensionReflection.getAlias}
   */
  #alias: string | undefined;

  readonly #title: string | undefined;

  /**
   *
   * @param name Name of module containing commands
   * @param parent Module containing commands
   * @param moduleCommands Data containing commands and execute methods
   * @param title Title if provided in options
   * @todo Determine the kind by inspecting `package.json` or smth
   */
  constructor(
    name: string,
    parent: ParentReflection,
    moduleCommands: ModuleCommands,
    title?: string
  ) {
    const {routeMap, execMethodDataSet} = moduleCommands;
    const kind = (
      name.includes('driver')
        ? AppiumPluginReflectionKind.Driver
        : name.includes('plugin')
        ? AppiumPluginReflectionKind.Plugin
        : AppiumPluginReflectionKind.Extension
    ) as any;
    super(name, kind, parent);
    this.parent = parent;
    this.routeMap = routeMap;
    this.execMethodDataSet = execMethodDataSet;
    this.#title = title;
  }

  /**
   * Returns `true` if the project contains more than one `ExtensionReflection` that isn't built-in commands.
   *
   * Should **not** be called before the TypeDoc converter has emitted `EVENT_RESOLVE_END`
   */
  static isCompositeProject = _.memoize(
    (project: ProjectReflection) =>
      project
        .getChildrenByKind(AppiumPluginReflectionKind.Extension as any)
        ?.filter(({name}) => name !== NAME_BUILTIN_COMMAND_MODULE).length > 1
  );

  /**
   * This is called by `AppiumTheme`'s `getUrl` method, which causes a particular filename to be used.
   *
   * - The name of an `ExtensionReflection` is the name of the module containing commands
   * - If that name is a _scoped package name_, we strip the scope and delimiter
   * - Replaces any non-alphanumeric characters with `-`
   * @returns The "alias", whatever that means
   */
  public override getAlias(): string {
    if (this.#alias) {
      return this.#alias;
    }

    let alias: string;
    const matches = this.name.match(SCOPED_PACKAGE_NAME_REGEX);
    alias = matches ? matches[2] : this.name;
    alias = alias.replace(/\W/, '-');
    this.#alias = alias;
    return alias;
  }

  /**
   * Returns the title for display. Used as the first-level header for rendered page.
   */
  public get extensionTitle(): string {
    if (this.#title) {
      return this.#title;
    }
    if (ExtensionReflection.isCompositeProject(this.project)) {
      return `${this.name} Commands`;
    }
    return 'Commands';
  }

  /**
   * Returns number of execute methods in this data
   */
  public get execMethodCount(): number {
    return this.execMethodDataSet.size;
  }

  /**
   * Returns `true` if there are any "execute commands" in this set.
   *
   * Used by templates
   */
  public get hasExecuteMethod(): boolean {
    return Boolean(this.execMethodCount);
  }

  /**
   * Returns `true` if there are any "regular" commands in this set.
   *
   * Used by templates
   */
  public get hasRoute(): boolean {
    return Boolean(this.routeCount);
  }

  /**
   * Returns number of routes ("commands") in this in this data
   */
  public get routeCount(): number {
    return this.routeMap.size;
  }
}
