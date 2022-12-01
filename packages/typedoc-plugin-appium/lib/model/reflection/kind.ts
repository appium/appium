/**
 * Declares new "kinds" within TypeDoc.
 *
 * A "kind" is a way for TypeDoc to understand how to document something.  Mostly, these have a 1:1 relationship with some sort of TypeScript concept.  This is unsuitable for our purposes, since there's no notion of a "command" or "execute method" in TypeScript.  To that end, we must create new ones.
 *
 * Note that _creating new `ReflectionKind`s is a hack_ and is not supported by TypeDoc. This is the reason you will see `as any` wherever a {@linkcode AppiumPluginReflectionKind} is used.
 */

import {addReflectionKind} from './utils';

/**
 * Namespace for our reflection kinds.
 *
 * The only reason we use a namespace is to avoid conflicts with TypeDoc or other plugins monkeying around in the "kind" system.
 */
export const NS = 'appium';

/**
 * Extends the TypeDoc's `ReflectionKind` to add namespaced kinds
 */
export enum AppiumPluginReflectionKind {
  COMMANDS = addReflectionKind(NS, 'Commands'),
  COMMAND = addReflectionKind(NS, 'Command'),
  EXECUTE_METHOD = addReflectionKind(NS, 'ExecuteMethod'),
  ANY = addReflectionKind(NS, 'Any', COMMAND | EXECUTE_METHOD | COMMANDS),
}
