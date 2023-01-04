import {Comment, DeclarationReflection, ParameterReflection} from 'typedoc';
import {AsyncMethodDeclarationReflection, CommentSourceType} from '../../converter';
import {isExecMethodData} from '../../guards';
import {CommandData, ExecMethodData} from '../command-data';
import {AllowedHttpMethod, Route} from '../types';
import {ExtensionReflection} from './extension';
import {AppiumPluginReflectionKind} from './kind';

/**
 * Execute Methods all have the same route.
 */
export const NAME_EXECUTE_ROUTE = '/session/:sessionId/execute';

/**
 * Execute methods all have the same HTTP method.
 */
export const HTTP_METHOD_EXECUTE = 'POST';

/**
 * A reflection containing data about a single command or execute method.
 *
 * Methods may be invoked directly by Handlebars templates.
 */
export class CommandReflection extends DeclarationReflection {
  /**
   * HTTP Method of the command or execute method
   */
  public readonly httpMethod: string;

  /**
   * Optional parameters, if any
   */
  public readonly optionalParams: string[];

  /**
   * Required parameters, if any
   */
  public readonly requiredParams: string[];

  /**
   * Route name
   */
  public readonly route: Route;

  /**
   * Script name, if any. Only used if kind is `EXECUTE_METHOD`
   */
  public readonly script?: string;

  /**
   * Comment, if any.
   */
  public readonly comment?: Comment;

  public readonly commentSource?: CommentSourceType;
  public readonly refl?: AsyncMethodDeclarationReflection;

  public readonly parameters?: ParameterReflection[];

  /**
   * Sets props depending on type of `data`
   * @param data Command or execute method data
   * @param parent Always a {@linkcode ExtensionReflection}
   * @param route Route, if not an execute method
   */
  constructor(
    readonly data: CommandData | ExecMethodData,
    parent: ExtensionReflection,
    route?: Route
  ) {
    let name: string;
    let kind: AppiumPluginReflectionKind;
    let script: string | undefined;
    let httpMethod: AllowedHttpMethod;

    // common data
    const {
      requiredParams,
      optionalParams,
      comment,
      methodRefl: refl,
      commentSource,
      parameters,
    } = data;

    // kind-specific data
    if (isExecMethodData(data)) {
      script = name = data.script;
      kind = AppiumPluginReflectionKind.ExecuteMethod;
      route = NAME_EXECUTE_ROUTE;
      httpMethod = HTTP_METHOD_EXECUTE;
    } else {
      if (!route) {
        throw new TypeError('"route" arg is required for a non-execute-method command');
      }
      name = route;
      kind = AppiumPluginReflectionKind.Command;
      httpMethod = data.httpMethod;
    }

    super(name, kind as any, parent);

    this.route = route;
    this.httpMethod = httpMethod;
    this.requiredParams = requiredParams ?? [];
    this.optionalParams = optionalParams ?? [];
    this.script = script;
    this.comment = comment;
    this.refl = refl;
    this.commentSource = commentSource;
    this.parameters = parameters;
  }

  /**
   * If `true`, this command has required parameters
   */
  public get hasRequiredParams(): boolean {
    return Boolean(this.requiredParams.length);
  }

  /**
   * If `true`, this command has optional parameters
   */
  public get hasOptionalParams(): boolean {
    return Boolean(this.optionalParams.length);
  }

  /**
   * If `true`, this command contains data about an execute method
   */
  public get isExecuteMethod(): boolean {
    return this.kindOf(AppiumPluginReflectionKind.ExecuteMethod as any);
  }
}
