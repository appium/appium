import _ from 'lodash';
import pluralize from 'pluralize';
import {
  Comment,
  DeclarationReflection,
  ParameterReflection,
  ReflectionFlag,
  ReflectionFlags,
  ReflectionKind,
} from 'typedoc';
import {
  AsyncMethodDeclarationReflection,
  ClassDeclarationReflection,
  CommentSourceType,
} from '../converter';
import {isCallSignatureReflectionWithParams} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {AllowedHttpMethod, Command, Route} from './types';

/**
 * Abstract representation of metadata for some sort of Appium command
 */
export abstract class BaseCommandData {
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
   * List of optional parameter names derived from a method map
   */
  public readonly optionalParams?: string[];
  /**
   * Actual method reflection.
   *
   * @todo Determine if this should be required
   */
  public readonly methodRefl?: AsyncMethodDeclarationReflection;
  /**
   * List of required parameter names derived from a method map
   */
  public readonly requiredParams?: string[];
  /**
   * The thing which the method is a member of for documentation purposes
   */
  parentRefl?: DeclarationReflection;

  protected readonly log: AppiumPluginLogger;

  /**
   * Cached computed parameters
   */
  #parameters: ParameterReflection[] | undefined;

  constructor(log: AppiumPluginLogger, command: Command, opts: CommandDataOpts = {}) {
    this.command = command;
    this.optionalParams = opts.optionalParams;
    this.requiredParams = opts.requiredParams;
    this.comment = opts.comment;
    this.commentSource = opts.commentSource;
    this.methodRefl = opts.refl;
    this.parentRefl = opts.parentRefl;
    this.log = log;
  }

  /**
   * Returns a list of its `ParameterReflection` objects in this instance's method's call signature.
   *
   * Used to display actual types of parameters by templates. The result is cached.
   */
  public get parameters(): ParameterReflection[] {
    if (!this.hasCommandParams) {
      return [];
    }
    if (this.#parameters) {
      return this.#parameters;
    }
    const sig = this.methodRefl?.signatures?.find(isCallSignatureReflectionWithParams);

    if (!sig) {
      return [];
    }

    const pRefls = [...sig.parameters!];

    if (pRefls.length < this.requiredParams!.length + this.optionalParams!.length) {
      this.log.warn(
        '(%s) Method %s has fewer parameters (%d) than specified in the method map (%d)',
        this.parentRefl!.name,
        this.methodRefl!.name,
        pRefls.length,
        this.requiredParams!.length + this.optionalParams!.length
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
      const commandParams = this[`${kind}Params`];
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
          _.assign(
            newPRefl,
            _.pick(pRefl, [
              'defaultValue',
              'comment',
              'type',
              'originalName',
              'label',
              'sources',
              'url',
              'anchor',
              'hasOwnDocument',
              'cssClasses',
            ])
          );

          // there doesn't seem to be a straightforward way to clone this object.
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
    this.#parameters = newParamRefls;
    return newParamRefls;
  }

  /**
   * Returns `true` if the method or execute map defined parameters for this command
   */
  get hasCommandParams(): boolean {
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
   * List of optional parameter names derived from a method map
   */
  optionalParams?: string[];
  /**
   * Actual method reflection.
   *
   * @todo Determine if this should be required
   */
  refl?: AsyncMethodDeclarationReflection;
  /**
   * List of required parameter names derived from a method map
   */
  requiredParams?: string[];
  /**
   * The thing which the method is a member of for documentation purposes
   */
  parentRefl?: DeclarationReflection;
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
