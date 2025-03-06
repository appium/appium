import type { BidiModuleMap } from '@appium/types';

export const BIDI_COMMANDS_MAP: BidiModuleMap = {
  'appium:storage': {
    upload: {
      command: 'uploadStorageItem',
      params: {
        required: ['name', 'hash', 'size', 'chunk', 'position'],
      }
    },
    list: {
      command: 'listStorageItems',
    },
    reset: {
      command: 'resetStorage',
    },
    delete: {
      command: 'deleteStorageItem',
      params: {
        required: ['name'],
      },
    },
  }
} as const;
