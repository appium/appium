import {addReflectionKind} from './utils';

/**
 * Namespace for our reflection kinds
 */
export const NS = 'appium';

/**
 * Extends the TypeDoc's `ReflectionKind` to add namespaced kinds
 */
export enum AppiumPluginReflectionKind {
  COMMANDS = addReflectionKind(NS, 'Commands'),
  COMMAND = addReflectionKind(NS, 'Command'),
  EXECUTE_COMMAND = addReflectionKind(NS, 'ExecuteCommand'),
  ANY = addReflectionKind(NS, 'Any', COMMAND | EXECUTE_COMMAND | COMMANDS),
}
