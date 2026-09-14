import type {BidiMethodMap} from '@appium/types';

export const STORAGE_BIDI_COMMANDS = {
  getCookies: {
    command: 'bidiStorageGetCookies',
    params: {
      optional: ['filter', 'partition'],
    },
  },
  setCookie: {
    command: 'bidiStorageSetCookie',
    params: {
      required: ['cookie'],
      optional: ['partition'],
    },
  },
  deleteCookies: {
    command: 'bidiStorageDeleteCookies',
    params: {
      optional: ['filter', 'partition'],
    },
  },
} as const satisfies BidiMethodMap;
