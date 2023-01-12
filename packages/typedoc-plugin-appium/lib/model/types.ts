import {DeclarationReflection, ProjectReflection} from 'typedoc';
import {CommandData, ExecMethodData} from './command-data';

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
 * All commands for a route.
 */
export type CommandSet = Set<CommandData>;

/**
 * A reflection which can be the parent of a {@linkcode ExtensionReflection}
 */
export type ParentReflection = DeclarationReflection | ProjectReflection;

/**
 * A map of routes to {@linkcode CommandSet} maps
 */
export type RouteMap = Map<Route, CommandSet>;

/**
 * A set of {@linkcode ExecMethodData} objects
 */
export type ExecMethodDataSet = Set<ExecMethodData>;
