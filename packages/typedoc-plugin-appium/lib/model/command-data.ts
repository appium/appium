import _ from 'lodash';
import {Comment, DeclarationReflection, ParameterReflection, SignatureReflection} from 'typedoc';
import {
  cloneSignatureReflection,
  CommandMethodDeclarationReflection,
  CommentSourceType,
  createNewParamRefls,
  KnownMethods,
} from '../converter';
import {isReferenceType} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {findCallSignature} from '../utils';
import {AllowedHttpMethod, Command, Route} from './types';

/**
 * Abstract representation of metadata for some sort of Appium command
 */
export abstract class BaseCommandData {
  /**
   * Loggher
   */
  protected readonly log: AppiumPluginLogger;

  /**
   * The method name of the command handler.
   */
  public readonly command: string;
  /**
   * The comment to display for the command, if any exists
   */
  public readonly comment?: Comment;
  /**
   * Code to describe how and where {@linkcode comment} came from.
   *
   * For debugging purposes mainly
   */
  public readonly commentSource?: CommentSourceType;
  /**
   * If `true`, this command is from a Plugin (not a Driver)
   */
  public readonly isPluginCommand: boolean;
  /**
   * Actual method reflection.
   */
  public readonly methodRefl: CommandMethodDeclarationReflection;
  /**
   * List of optional parameter names derived from a method map
   */
  public readonly optionalParams?: string[];
  /**
   * List of required parameter names derived from a method map
   */
  public readonly requiredParams?: string[];

  /**
   * Map of known builtin methods
   */
  public readonly knownBuiltinMethods?: KnownMethods;

  /**
   * Parameter reflections for this command's method declaration, to eventually be displayed in rendered docs
   *
   * These are _not_ the same objects as in the `parameters` property of a the call signature
   * reflection in `methodRefl`; the comments therein have been aggregated and the parameters have
   * been renamed and possibly truncated.
   */
  public readonly parameters?: ParameterReflection[];
  /**
   * Signature reflection for this command's method declaration, to eventually be displayed in
   * rendered docs
   *
   * `methodRefl` is a {@linkcode CommandMethodDeclarationReflection}, so it returns a `Promise<T>`, by
   * definition.  This signature reflection is modified so that it returns `T` instead, since
   * `Promise`s don't make much sense in the rendered documentaion.
   *
   * The default TypeDoc output uses the original `SignatureReflection`, so you _will_ see
   * `Promise<T>` there.
   */
  public readonly signature?: SignatureReflection;

  /**
   * Returns a list of `ParameterReflection` objects in the command's method declaration;
   * rewrites them to prefer the method map parameter list (and the param names)
   **/
  public static rewriteParameters = _.memoize((cmd: BaseCommandData) => {
    if (!cmd.hasCommandParams) {
      return;
    }

    const newParamRefls = [
      ...createNewParamRefls(cmd.methodRefl, {
        builtinMethods: cmd.knownBuiltinMethods,
        commandParams: cmd.requiredParams,
        isPluginCommand: cmd.isPluginCommand,
        sig: cmd.signature,
      }),
      ...createNewParamRefls(cmd.methodRefl, {
        builtinMethods: cmd.knownBuiltinMethods,
        commandParams: cmd.optionalParams,
        isPluginCommand: cmd.isPluginCommand,
        sig: cmd.signature,
        isOptional: true,
      }),
    ];

    return newParamRefls;
  });

  /**
   * Rewrites a method's return value for documentation.
   *
   * Given a command having a method declaration, creates a clone of its call signature wherein the
   * return type is unwrapped from `Promise`.  In other words, if a method returns `Promise<T>`,
   * this changes the return type in the signature to `T`.
   *
   * Note that the return type of a command's method declaration should always be a `ReferenceType` having
   * name `Promise`.
   */
  public static unwrapSignatureType = _.memoize((cmd: BaseCommandData) => {
    const callSig = findCallSignature(cmd.methodRefl);
    if (!callSig) {
      return;
    }
    if (isReferenceType(callSig.type) && callSig.type.name === 'Promise') {
      // this does the actual unwrapping.  `Promise` only has a single type argument `T`,
      // so we can safely use the first one.
      const newType = callSig.type.typeArguments?.[0];
      const newCallSig = cloneSignatureReflection(callSig, cmd.methodRefl, newType);

      if (!newCallSig.type) {
        cmd.log.warn(
          '(%s) No type arg T found for return type Promise<T> in %s; this is a bug',
          cmd.parentRefl!.name,
          cmd.methodRefl.name
        );
        return;
      }
      return newCallSig;
    }
  });

  /**
   * The thing which the method is a member of for documentation purposes
   */
  parentRefl?: DeclarationReflection;

  constructor(
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    opts: CommandDataOpts = {}
  ) {
    this.command = command;
    this.methodRefl = methodRefl;
    this.log = log;

    this.optionalParams = opts.optionalParams;
    this.requiredParams = opts.requiredParams;
    this.comment = opts.comment;
    this.commentSource = opts.commentSource;
    this.parentRefl = opts.parentRefl;
    this.knownBuiltinMethods = opts.knownBuiltinMethods;
    this.isPluginCommand = Boolean(opts.isPluginCommand);

    this.signature = BaseCommandData.unwrapSignatureType(this);
    this.parameters = BaseCommandData.rewriteParameters(this);
  }

  /**
   * Returns `true` if the method or execute map defined parameters for this command
   */
  public get hasCommandParams(): boolean {
    return Boolean(this.optionalParams?.length || this.requiredParams?.length);
  }
  /**
   * Should create a shallow clone of the implementing instance
   * @param opts New options to pass to the new instance
   */
  public abstract clone(opts: CommandDataOpts): BaseCommandData;
}

/**
 * Options for {@linkcode CommandData} and {@linkcode ExecMethodData} constructors
 */
export interface CommandDataOpts {
  /**
   * The comment to display for the command, if any exists
   */
  comment?: Comment;
  /**
   * Name of the reference which the comment is derived from.
   *
   * For debugging purposes mainly
   */
  commentSource?: CommentSourceType;

  /**
   * If `true`, `refl` represents a `PluginCommand`, wherein we will ignore
   * the first two parameters altogether.
   */
  isPluginCommand?: boolean;

  /**
   * List of optional parameter names derived from a method map
   */
  optionalParams?: string[];

  /**
   * The thing which the method is a member of for documentation purposes
   */
  parentRefl?: DeclarationReflection;

  /**
   * List of required parameter names derived from a method map
   */
  requiredParams?: string[];

  /**
   * Known methods in the project
   */
  knownBuiltinMethods?: KnownMethods;
}

/**
 * Represents a generic WD or Appium-specific endpoint
 */
export class CommandData extends BaseCommandData {
  /**
   * The HTTP method of the route
   */
  public readonly httpMethod: AllowedHttpMethod;

  /**
   * The route of the command
   */
  public readonly route: Route;

  constructor(
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    httpMethod: AllowedHttpMethod,
    route: Route,
    opts: CommandDataOpts = {}
  ) {
    super(log, command, methodRefl, opts);
    this.httpMethod = httpMethod;
    this.route = route;
  }

  /**
   * Creates a **shallow** clone of this instance.
   *
   * Keeps props {@linkcode BaseCommandData.command command},
   * {@linkcode CommandData.httpMethod httpMethod} and
   * {@linkcode CommandData.route route}, then applies any other options.
   * @param opts Options to apply. _Note:_ you probably want to provide a new `parentRefl`.
   * @returns Cloned instance
   */
  public override clone(opts: CommandDataOpts = {}): CommandData {
    return new CommandData(this.log, this.command, this.methodRefl, this.httpMethod, this.route, {
      ...this,
      ...opts,
    });
  }
}

/**
 * Represents an "execute command" ("execute method")
 *
 * Each will have a unique `script` property which is provided as the script to run via the
 * `execute` WD endpoint.
 *
 * All of these share the same `execute` route, so it is omitted from this interface.
 */
export class ExecMethodData extends BaseCommandData {
  /**
   * The name/identifier of the execute script
   *
   * This is different than the method name.
   */
  public readonly script: string;

  constructor(
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    script: string,
    opts: CommandDataOpts = {}
  ) {
    super(log, command, methodRefl, opts);
    this.script = script;
  }

  /**
   * Creates a **shallow** clone of this instance.
   *
   * Keeps props {@linkcode BaseCommandData.command command}, {@linkcode ExecMethod.script script},
   * then applies any other options.
   * @param opts Options to apply
   * @returns Cloned instance
   */
  public override clone(opts: CommandDataOpts): ExecMethodData {
    return new ExecMethodData(this.log, this.command, this.methodRefl, this.script, {
      ...this,
      ...opts,
    });
  }
}
