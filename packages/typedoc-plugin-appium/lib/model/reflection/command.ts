import {Comment} from 'typedoc';
import {CommandRef, ExecuteCommandRef, ParentReflection, Route} from '../types';
import {CommandsReflection} from './commands';
import {AppiumPluginReflectionKind} from './kind';
import {AppiumPluginReflection} from './plugin';

/**
 * The route will be this
 */
export const NAME_EXECUTE_ROUTE = '/session/:sessionId/execute';

export const HTTP_METHOD_EXECUTE = 'POST';

export class CommandReflection extends AppiumPluginReflection {
  public readonly httpMethod: string;
  public readonly optionalParams: string[];
  public readonly requiredParams: string[];
  public readonly route: Route;
  public readonly script?: string;
  public readonly comment?: Comment;

  constructor(
    readonly commandRef: CommandRef | ExecuteCommandRef,
    module: ParentReflection,
    route: Route,
    parent: CommandsReflection
  ) {
    const name = CommandReflection.isExecuteCommandRef(commandRef) ? commandRef.script : route;
    super(
      name,
      (CommandReflection.isExecuteCommandRef(commandRef)
        ? AppiumPluginReflectionKind.EXECUTE_COMMAND
        : AppiumPluginReflectionKind.COMMAND) as any,
      module,
      parent
    );

    this.route = route;
    this.httpMethod = 'httpMethod' in commandRef ? commandRef.httpMethod : HTTP_METHOD_EXECUTE;
    this.requiredParams = commandRef.requiredParams ?? [];
    this.optionalParams = commandRef.optionalParams ?? [];
    this.script = 'script' in commandRef ? commandRef.script : undefined;
    this.comment = commandRef.comment;
  }

  public get hasRequiredParams(): boolean {
    return Boolean(this.requiredParams.length);
  }

  public get hasOptionalParams(): boolean {
    return Boolean(this.optionalParams.length);
  }

  public get isExecuteCommand(): boolean {
    return Boolean(this.script && this.route === NAME_EXECUTE_ROUTE);
  }

  /**
   * Type guard for execute command refs
   * @param ref Command reference
   * @returns `true` if it's an execute command
   */
  public static isExecuteCommandRef(ref: CommandRef | ExecuteCommandRef): ref is ExecuteCommandRef {
    return 'script' in ref;
  }
}
