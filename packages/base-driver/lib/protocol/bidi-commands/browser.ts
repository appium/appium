import type {BidiMethodMap} from '@appium/types';

export const BROWSER_BIDI_COMMANDS = {
  close: {
    command: 'bidiBrowserClose',
    params: {},
  },
  createUserContext: {
    command: 'bidiBrowserCreateUserContext',
    params: {
      optional: ['acceptInsecureCerts', 'proxy', 'unhandledPromptBehavior'],
    },
  },
  getClientWindows: {
    command: 'bidiBrowserGetClientWindows',
    params: {},
  },
  getUserContexts: {
    command: 'bidiBrowserGetUserContexts',
    params: {},
  },
  removeUserContext: {
    command: 'bidiBrowserRemoveUserContext',
    params: {
      required: ['userContext'],
    },
  },
  setClientWindowState: {
    command: 'bidiBrowserSetClientWindowState',
    params: {
      required: ['clientWindow', 'state'],
      optional: ['width', 'height', 'x', 'y'],
    },
  },
  setDownloadBehavior: {
    command: 'bidiBrowserSetDownloadBehavior',
    params: {
      required: ['downloadBehavior'],
      optional: ['userContexts'],
    },
  },
} as const satisfies BidiMethodMap;
