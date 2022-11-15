import {ReflectionKind} from 'typedoc';
import {addReflectionKind} from './utils';

export const NS = 'appium';

/**
 * Extends the {@link ReflectionKind} to add custom Page, Menu & Any kinds.
 */
export enum AppiumPluginReflectionKind {
  ROOT = addReflectionKind(NS, 'Root'),
  COMMANDS = addReflectionKind(NS, 'Commands'),
  COMMAND = addReflectionKind(NS, 'Command'),
  EXECUTE_COMMAND = addReflectionKind(NS, 'ExecuteCommand'),
  MENU = addReflectionKind(NS, 'Menu'),
  ANY = addReflectionKind(NS, 'Any', MENU | COMMAND | EXECUTE_COMMAND | COMMANDS),
}
addReflectionKind(
  NS,
  'Root Commands',
  AppiumPluginReflectionKind.ROOT | AppiumPluginReflectionKind.COMMANDS
);
addReflectionKind(
  NS,
  'Root Menu',
  AppiumPluginReflectionKind.ROOT | AppiumPluginReflectionKind.MENU
);
AppiumPluginReflectionKind as unknown as ReflectionKind;
