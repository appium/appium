import _ from 'lodash';
import {
  Comment,
  DeclarationReflection,
  ParameterReflection,
  ReflectionFlag,
  ReflectionFlags,
  ReflectionKind,
  SignatureReflection,
} from 'typedoc';
import {CommandMethodDeclarationReflection, CommentSourceType} from '../converter';
import {isCallSignatureReflection, isReferenceType} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {AllowedHttpMethod, Command, Route} from './types';

/**
 * List of fields to shallow copy from a `SignatureReflection` to a clone
 * @internal
 */
const SIGNATURE_REFLECTION_CLONE_FIELDS = [
  'anchor',
  'comment',
  'flags',
  'hasOwnDocument',
  'implementationOf',
  'inheritedFrom',
  'kindString',
  'label',
  'originalName',
  'overwrites',
  'parameters',
  'sources',
  'typeParameters',
  'url',
];

/**
 * List of fields to shallow copy from a `ParameterReflection` to a clone
 * @internal
 */
const PARAMETER_REFLECTION_CLONE_FIELDS = [
  'anchor',
  'comment',
  'cssClasses',
  'defaultValue',
  'hasOwnDocument',
  'label',
  'originalName',
  'sources',
  'type',
  'url',
];

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
   *
   * @todo Determine if this should be required
   */
  public readonly methodRefl?: CommandMethodDeclarationReflection;
  /**
   * List of optional parameter names derived from a method map
   */
  public readonly optionalParams?: string[];
  /**
   * List of required parameter names derived from a method map
   */
  public readonly requiredParams?: string[];

  /**
   * Loops through signatures of the command's method declaration and returns the first that is a
   * `CallSignatureReflection` (if any).  This is what we think of when we think "function signature"
   */
  public static findCallSignature = _.memoize((cmd: BaseCommandData) =>
    cmd.methodRefl?.getAllSignatures()?.find(isCallSignatureReflection)
  );

  /**
   * Returns a list of `ParameterReflection` objects in the command's method declaration;
   * rewrites them to prefer the method map parameter list (and the param names)
   **/
  public static rewriteParameters = _.memoize((cmd: BaseCommandData) => {
    if (!cmd.hasCommandParams) {
      return [];
    }
    const sig = BaseCommandData.findCallSignature(cmd);

    if (!sig) {
      return [];
    }

    const pRefls = (cmd.isPluginCommand ? sig.parameters?.slice(2) : sig.parameters?.slice()) ?? [];

    if (pRefls.length < cmd.requiredParams!.length + cmd.optionalParams!.length) {
      cmd.log.warn(
        '(%s) Method %s has fewer parameters (%d) than specified in the method map (%d)',
        cmd.parentRefl!.name,
        cmd.methodRefl!.name,
        pRefls.length,
        cmd.requiredParams!.length + cmd.optionalParams!.length
      );
    }

    /**
     * This loops over the command parameter names as defined in the method/execute map and attempts
     * to associate a `ParameterReflection` object with each.
     *
     * Because the command param names are essentially properties of a JSON object and the
     * `ParameterReflection` instances represent the arguments of a method, we must match them by
     * index. In JS, Required arguments always come first, so we can do those first. If there are
     * _more_ method arguments than command param names, we toss them out, because they may not be
     * part of the public API.
     * @param kind Either `required` or `optional`
     * @returns List of refls with names matching `commandParams`, throwing out any extra refls
     */
    const createNewRefls = (kind: 'required' | 'optional'): ParameterReflection[] => {
      const commandParams = cmd[`${kind}Params`];
      if (!commandParams?.length) {
        return [];
      }
      const paramCount = commandParams.length;

      const newParamRefls: ParameterReflection[] = [];
      for (let i = 0; i < paramCount; i++) {
        const pRefl = pRefls.shift();
        if (pRefl) {
          // if there isn't one, the warning above will have been logged already
          const newPRefl = new ParameterReflection(
            commandParams[i],
            ReflectionKind.CallSignature,
            sig
          );
          _.assign(newPRefl, _.pick(pRefl, PARAMETER_REFLECTION_CLONE_FIELDS));

          // there doesn't seem to be a straightforward way to clone flags.
          newPRefl.flags = new ReflectionFlags(...pRefl.flags);
          newPRefl.flags.setFlag(ReflectionFlag.Optional, kind === 'optional');
          newParamRefls.push(newPRefl);
        }
      }
      return newParamRefls;
    };

    const newParamRefls = [...createNewRefls('required'), ...createNewRefls('optional')];

    if (!newParamRefls.length) {
      return [];
    }
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
    const callSig = BaseCommandData.findCallSignature(cmd);
    if (!callSig) {
      return;
    }
    if (isReferenceType(callSig.type) && callSig.type.name === 'Promise') {
      const newCallSig = new SignatureReflection(
        callSig.name,
        ReflectionKind.CallSignature,
        cmd.methodRefl!
      );
      _.assign(newCallSig, _.pick(callSig, SIGNATURE_REFLECTION_CLONE_FIELDS));

      // this is the actual unwrapping.  `Promise` only has a single type argument `T`,
      // so we can safely use the first one.
      newCallSig.type = callSig.type.typeArguments?.[0];

      if (!newCallSig.type) {
        cmd.log.warn(
          '(%s) No type arg T found for return type Promise<T> in %s; this is a bug',
          cmd.parentRefl!.name,
          cmd.methodRefl!.name
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

  constructor(log: AppiumPluginLogger, command: Command, opts: CommandDataOpts = {}) {
    this.command = command;
    this.optionalParams = opts.optionalParams;
    this.requiredParams = opts.requiredParams;
    this.comment = opts.comment;
    this.commentSource = opts.commentSource;
    this.methodRefl = opts.refl;
    this.parentRefl = opts.parentRefl;
    this.log = log;
    this.isPluginCommand = Boolean(opts.isPluginCommand);
  }

  /**
   * Returns `true` if the method or execute map defined parameters for this command
   */
  public get hasCommandParams(): boolean {
    return Boolean(this.optionalParams?.length || this.requiredParams?.length);
  }

  /**
   * Gets a list of function parameters (for use in rendering)
   */
  public get parameters() {
    return BaseCommandData.rewriteParameters(this);
  }

  /**
   * Gets the call signature (for use in rendering)
   */
  public get signature() {
    return BaseCommandData.unwrapSignatureType(this);
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
   * Actual method reflection.
   *
   * @todo Determine if this should be required
   */
  refl?: CommandMethodDeclarationReflection;

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

  constructor(
    log: AppiumPluginLogger,
    command: Command,
    httpMethod: AllowedHttpMethod,
    route: Route,
    opts: CommandDataOpts = {}
  ) {
    super(log, command, opts);
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
    return new CommandData(this.log, this.command, this.httpMethod, this.route, {...this, ...opts});
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
    script: string,
    opts: CommandDataOpts = {}
  ) {
    super(log, command, opts);
    this.script = script;
    if (!this.methodRefl) {
      this.log.verbose(`No reflection for script ${script}`);
    }
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
    return new ExecMethodData(this.log, this.command, this.script, {...this, ...opts});
  }
}
