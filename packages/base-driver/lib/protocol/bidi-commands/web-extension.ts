import type {BidiMethodMap} from '@appium/types';

export const WEB_EXTENSION_BIDI_COMMANDS = {
  install: {
    command: 'bidiWebExtensionInstall',
    params: {
      required: ['extensionData'],
    },
  },
  uninstall: {
    command: 'bidiWebExtensionUninstall',
    params: {
      required: ['extension'],
    },
  },
} as const satisfies BidiMethodMap;
