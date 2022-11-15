import {Comment, DeclarationReflection, ProjectReflection} from 'typedoc';
import {CommandInfo} from './command-info';
import {CommandsReflection} from './reflection';

/**
 * I don't think we allow other HTTP methods?
 */
export type AllowedHttpMethod = 'GET' | 'POST' | 'DELETE';
export type Route = string;
export type Command = string;

export type CommandMap = Map<Command, CommandRef>;

export type ProjectCommands = Map<ParentReflection, CommandInfo>;

export interface BaseCommandRef {
  command: string;
  optionalParams?: string[];
  requiredParams?: string[];
  comment?: Comment;
}

export interface CommandRef extends BaseCommandRef {
  httpMethod: AllowedHttpMethod;
  route: Route;
}

export interface ExecuteCommandRef extends BaseCommandRef {
  script: string;
}

export type ParentReflection = DeclarationReflection | ProjectReflection;
export type CommandReflectionMap = Map<ParentReflection, CommandsReflection>;

export type RouteMap = Map<Route, CommandMap>;

export type ExecuteCommandSet = Set<ExecuteCommandRef>;
