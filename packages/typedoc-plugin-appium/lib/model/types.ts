import {Comment, DeclarationReflection, ProjectReflection} from 'typedoc';
import {CommandInfo} from './command-info';

/**
 * WD spec allows these HTTP methods.
 */
export type AllowedHttpMethod = 'GET' | 'POST' | 'DELETE';
/**
 * An Express-style "route", otherwise known as a "URI Template"
 *
 * Aliased for intent
 */
export type Route = string;

/**
 * A method name in `BaseDriver` or subclass thereof
 *
 * Currently must be a string, but could theoretically be a {@link PropertyKey}
 *
 * Aliased for intent
 */
export type Command = string;

/**
 * Mapping of a command to its {@linkcode CommandData}
 */
export type CommandMap = Map<Command, CommandData>;

/**
 * Map of a {@linkcode ParentReflection} to command info for that reflection
 */
export type ModuleCommands = Map<ParentReflection, CommandInfo>;

/**
 * Common fields for a {@linkcode CommandData} or {@linkcode ExecCommandData}
 */
export interface BaseCommandData {
  /**
   * The method name of the command handler.
   *
   * This is sort of the "unique identifier"
   */
  command: string;
  /**
   * List of optional parameter names
   */
  optionalParams?: string[];
  /**
   * List of required parameter names
   */
  requiredParams?: string[];
  /**
   * The comment for the command, if any exists
   */
  comment?: Comment;
}

/**
 * Represents a generic WD or Appium-specific endpoint
 */
export interface CommandData extends BaseCommandData {
  /**
   * The HTTP method of the route
   */
  httpMethod: AllowedHttpMethod;
  /**
   * The route of the command
   */
  route: Route;
}

/**
 * Represents an "execute command" ("execute method")
 *
 * Each will have a unique `script` property which is provided as the script to run via the `execute` WD endpoint.
 *
 * All of these share the same `execute` route, so it is omitted from this interface.
 */
export interface ExecCommandData extends BaseCommandData {
  script: string;
}

/**
 * A reflection which can be the parent of a {@linkcode CommandsReflection}
 */
export type ParentReflection = DeclarationReflection | ProjectReflection;

/**
 * A map of routes to {@linkcode CommandMap} maps
 */
export type RouteMap = Map<Route, CommandMap>;

/**
 * A set of {@linkcode ExecCommandData} objects
 */
export type ExecCommandDataSet = Set<ExecCommandData>;
