import type {BidiModuleMap} from '@appium/types';

import {BROWSER_BIDI_COMMANDS} from './browser.js';
import {BROWSING_CONTEXT_BIDI_COMMANDS} from './browsing-context.js';
import {EMULATION_BIDI_COMMANDS} from './emulation.js';
import {INPUT_BIDI_COMMANDS} from './input.js';
import {NETWORK_BIDI_COMMANDS} from './network.js';
import {SCRIPT_BIDI_COMMANDS} from './script.js';
import {SESSION_BIDI_COMMANDS} from './session.js';
import {STORAGE_BIDI_COMMANDS} from './storage.js';
import {WEB_EXTENSION_BIDI_COMMANDS} from './web-extension.js';

/**
 * Mapping of BiDi modules to their commands and any parameters that are
 * expected in a command's payload. Parameters can be `required` or `optional`.
 *
 * Assembled from the grouped command definitions in this directory, one per
 * BiDi module, so each group can be reviewed and maintained independently.
 * @see https://w3c.github.io/webdriver-bidi/
 */
export const BIDI_COMMANDS = {
  session: SESSION_BIDI_COMMANDS,
  browser: BROWSER_BIDI_COMMANDS,
  browsingContext: BROWSING_CONTEXT_BIDI_COMMANDS,
  emulation: EMULATION_BIDI_COMMANDS,
  network: NETWORK_BIDI_COMMANDS,
  script: SCRIPT_BIDI_COMMANDS,
  storage: STORAGE_BIDI_COMMANDS,
  input: INPUT_BIDI_COMMANDS,
  webExtension: WEB_EXTENSION_BIDI_COMMANDS,
} as const satisfies BidiModuleMap;
