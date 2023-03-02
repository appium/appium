import _ from 'lodash';
import {
  Comment,
  Context,
  DeclarationReflection,
  IntrinsicType,
  LiteralType,
  ParameterReflection,
  ReferenceType,
  SignatureReflection,
} from 'typedoc';
import {
  CallSignatureReflection,
  cloneCallSignatureReflection,
  CommandMethodDeclarationReflection,
  CommentSource,
  createNewParamRefls,
  deriveComment,
  Example,
  extractExamples,
  KnownMethods,
} from '../converter';
import {AppiumPluginLogger} from '../logger';
import {findCallSignature} from '../utils';
import {AllowedHttpMethod, Command, Route} from './types';

/**
 * Set of type names which should be converted to `null`
 * @see https://github.com/appium/appium/issues/18269
 */
const NULL_TYPES: Readonly<Set<string>> = new Set(['undefined', 'void']);

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
  public readonly commentSource?: CommentSource;
  /**
   * Language-specific examples for the command, if any
   */
  public readonly examples?: Example[];
  /**
   * If `true`, this command is from a Plugin (not a Driver)
   */
  public readonly isPluginCommand: boolean;
  /**
   * Map of known builtin methods
   */
  public readonly knownBuiltinMethods?: KnownMethods;
  /**
   * Actual method reflection.
   */
  public readonly methodRefl: CommandMethodDeclarationReflection;
  /**
   * List of optional parameter names derived from a method map
   */
  public readonly optionalParams?: string[];
  /**
   * Parameter reflections for this command's method declaration, to eventually be displayed in rendered docs
   *
   * These are _not_ the same objects as in the `parameters` property of a the call signature
   * reflection in `methodRefl`; the comments therein have been aggregated and the parameters have
   * been renamed and possibly truncated.
   */
  public readonly parameters?: ParameterReflection[];
  /**
   * The thing which the method is a member of for documentation purposes
   */
  public readonly parentRefl?: DeclarationReflection;
  /**
   * List of required parameter names derived from a method map
   */
  public readonly requiredParams?: string[];
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

  constructor(
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    public readonly opts: BaseCommandDataOpts = {}
  ) {
    this.command = command;
    this.methodRefl = methodRefl;
    this.log = log;

    this.optionalParams = opts.optionalParams;
    this.requiredParams = opts.requiredParams;

    this.commentSource = opts.commentSource;
    this.parentRefl = opts.parentRefl;
    this.knownBuiltinMethods = opts.knownBuiltinMethods;
    this.isPluginCommand = Boolean(opts.isPluginCommand);

    const extractedExamples = extractExamples(opts.comment);
    if (extractedExamples?.comment) {
      this.comment = extractedExamples.comment;
    }
    if (extractedExamples?.examples) {
      this.examples = extractedExamples.examples;
    }

    this.parameters = this.rewriteParameters();
    this.signature = this.rewriteSignature();
  }

  /**
   * Returns `true` if the method or execute map defined parameters for this command
   */
  public get hasCommandParams(): boolean {
    return Boolean(this.optionalParams?.length || this.requiredParams?.length);
  }

  /**
   * Returns a list of `ParameterReflection` objects in the command's method declaration;
   * rewrites them to prefer the method map parameter list (and the param names)
   */
  private rewriteParameters(): ParameterReflection[] | undefined {
    if (!this.hasCommandParams) {
      return;
    }

    const sig = findCallSignature(this.methodRefl)!;
    if (!sig?.parameters?.length) {
      // no parameters
      return;
    }

    const {knownBuiltinMethods: builtinMethods, isPluginCommand} = this;

    const newParamRefls = [
      ...createNewParamRefls(sig, {
        builtinMethods,
        commandParams: this.requiredParams,
        isPluginCommand,
      }),
      ...createNewParamRefls(sig, {
        builtinMethods,
        commandParams: this.optionalParams,
        isPluginCommand,
        isOptional: true,
      }),
    ];

    return newParamRefls;
  }

  /**
   *
   * Rewrites a method's return value for documentation.
   *
   * Given a command having a method declaration, creates a clone of its call signature wherein the
   * return type is unwrapped from `Promise`.  In other words, if a method returns `Promise<T>`,
   * this changes the return type in the signature to `T`.
   *
   * Note that the return type of a command's method declaration should always be a `ReferenceType` having
   * name `Promise`.
   */
  private rewriteSignature(): CallSignatureReflection | undefined {
    const callSig = findCallSignature(this.methodRefl);
    if (!callSig) {
      return;
    }
    if (callSig.type instanceof ReferenceType && callSig.type.name === 'Promise') {
      // this does the actual unwrapping.  `Promise` only has a single type argument `T`,
      // so we can safely use the first one.
      let typeArg = _.first(callSig.type.typeArguments)!;

      // swaps `void`/`undefined` for `null`
      if (typeArg instanceof IntrinsicType && NULL_TYPES.has(typeArg.name)) {
        typeArg = new LiteralType(null);
      }

      const newCallSig = cloneCallSignatureReflection(callSig, this.methodRefl, typeArg);

      if (!newCallSig.type) {
        this.log.warn(
          '(%s) No type arg T found for return type Promise<T> in %s; this is a bug',
          this.parentRefl!.name,
          this.methodRefl.name
        );
        return;
      }

      newCallSig.comment = deriveComment({
        refl: newCallSig,
        knownMethods: this.knownBuiltinMethods,
      })?.comment;

      return newCallSig;
    }
  }
}

/**
 * Options for {@linkcode CommandData} and {@linkcode ExecMethodData} constructors
 */
export interface BaseCommandDataOpts {
  /**
   * The comment to display for the command, if any exists
   */
  comment?: Comment;
  /**
   * Name of the reference which the comment is derived from.
   *
   * For debugging purposes mainly
   */
  commentSource?: CommentSource;
  /**
   * If `true`, `refl` represents a `PluginCommand`, wherein we will ignore
   * the first two parameters altogether.
   */
  isPluginCommand?: boolean;
  /**
   * Known methods in the project
   */
  knownBuiltinMethods?: KnownMethods;
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

  /**
   * Use {@linkcode CommandData.create} instead
   */
  private constructor(
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    httpMethod: AllowedHttpMethod,
    route: Route,
    opts: BaseCommandDataOpts = {}
  ) {
    super(log, command, methodRefl, opts);
    this.httpMethod = httpMethod;
    this.route = route;
  }

  /**
   * Creates a **shallow** clone of this instance.
   *
   * @param commandData Instance to clone
   * @param ctx Context
   * @param overrides Override any properties of the instance here (including {@linkcode CommandData.opts})
   * @returns Cloned instance
   */
  public static clone(commandData: CommandData, ctx: Context, overrides?: Partial<CommandData>) {
    const {log, command, methodRefl, httpMethod, route, opts} = _.defaults(overrides, {
      log: commandData.log,
      command: commandData.command,
      methodRefl: commandData.methodRefl,
      httpMethod: commandData.httpMethod,
      route: commandData.route,
      opts: _.defaults(overrides?.opts, commandData.opts),
    });
    return CommandData.create(ctx, log, command, methodRefl, httpMethod, route, opts);
  }

  /**
   * Creates a new instance of {@linkcode CommandData} and registers any newly-created reflections
   * with TypeDoc.
   * @param ctx Context
   * @param log Logger
   * @param command Command name
   * @param methodRefl Command method reflection
   * @param httpMethod HTTP method of route
   * @param route Route path
   * @param opts Options
   * @returns
   */
  public static create(
    ctx: Context,
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    httpMethod: AllowedHttpMethod,
    route: Route,
    opts: BaseCommandDataOpts = {}
  ): CommandData {
    const commandData = new CommandData(log, command, methodRefl, httpMethod, route, opts);

    if (commandData.signature) {
      ctx.registerReflection(commandData.signature, undefined);
    }

    if (commandData.parameters) {
      for (const param of commandData.parameters) {
        ctx.registerReflection(param, undefined);
      }
    }

    return commandData;
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
   * Use {@linkcode ExecMethodData.create} instead
   * @param log Logger
   * @param command Command name
   * @param methodRefl method reflection
   * @param script Script name (not the same as command name); this is what is passed to the `execute` endpoint
   */
  private constructor(
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    public readonly script: string,
    public readonly opts: BaseCommandDataOpts = {}
  ) {
    super(log, command, methodRefl, opts);
  }

  /**
   * Creates a **shallow** clone of this instance.
   *
   * @param execMethodData Instance to clone
   * @param ctx Context
   * @param overrides Override any properties of the instance here (including {@linkcode ExecMethodData.opts})
   * @returns Cloned instance
   */
  public static clone(
    execMethodData: ExecMethodData,
    ctx: Context,
    overrides?: Partial<ExecMethodData>
  ) {
    const {log, command, methodRefl, script, opts} = _.defaults(overrides, {
      log: execMethodData.log,
      command: execMethodData.command,
      methodRefl: execMethodData.methodRefl,
      script: execMethodData.script,
      opts: _.defaults(overrides?.opts, execMethodData.opts),
    });
    return ExecMethodData.create(ctx, log, command, methodRefl, script, opts);
  }

  /**
   * Creates a new instance of {@linkcode CommandData} and registers any newly-created reflections
   * with TypeDoc.
   * @param ctx Context
   * @param log Logger
   * @param command Command name
   * @param script Script name
   * @param route Route path
   * @param opts Options
   */
  public static create(
    ctx: Context,
    log: AppiumPluginLogger,
    command: Command,
    methodRefl: CommandMethodDeclarationReflection,
    script: string,
    opts: BaseCommandDataOpts = {}
  ): ExecMethodData {
    const execMethodData = new ExecMethodData(log, command, methodRefl, script, opts);

    if (execMethodData.signature) {
      ctx.registerReflection(execMethodData.signature, undefined);
    }

    if (execMethodData.parameters) {
      for (const param of execMethodData.parameters) {
        ctx.registerReflection(param, undefined);
      }
    }

    return execMethodData;
  }
}
