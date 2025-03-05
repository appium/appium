import type { BidiModuleMap } from '@appium/types';

export const BIDI_COMMANDS_MAP: BidiModuleMap = {
  'appium:storage': {
    upload: {
      command: 'upload',
      params: {
        required: ['name', 'hash', 'size', 'chunk', 'position'],
      }
    },
    list: {
      command: 'list',
    },
    reset: {
      command: 'reset',
    },
    delete: {
      command: 'delete',
      params: {
        required: ['name'],
      },
    },
  }
} as const;
