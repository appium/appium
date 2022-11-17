import {Comment} from 'typedoc';
import {CommandData, ExecCommandData, ParentReflection, Route} from '../types';
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
    readonly commandRef: CommandData | ExecCommandData,
    parent: CommandsReflection,
    route: Route = NAME_EXECUTE_ROUTE
  ) {
    let name: string;
    let kind: AppiumPluginReflectionKind;

    if (CommandReflection.isExecCommandData(commandRef)) {
      name = commandRef.script;
      kind = AppiumPluginReflectionKind.EXECUTE_COMMAND;
    } else {
      name = route;
      kind = AppiumPluginReflectionKind.COMMAND;
    }
    super(name, kind as any, parent);

    this.route = route;
    this.httpMethod = 'httpMethod' in commandRef ? commandRef.httpMethod : HTTP_METHOD_EXECUTE;
    this.requiredParams = commandRef.requiredParams ?? [];
    this.optionalParams = commandRef.optionalParams ?? [];
    this.script = CommandReflection.isExecCommandData(commandRef) ? commandRef.script : undefined;
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
  public static isExecCommandData(ref: CommandData | ExecCommandData): ref is ExecCommandData {
    return 'script' in ref;
  }
}
