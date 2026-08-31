import type {Driver, MethodMap} from '@appium/types';

/**
 * Federated Credential Management (FedCM).
 * @see https://www.w3.org/TR/fedcm-1/
 */
export const FEDCM_ROUTES = {
  '/session/:sessionId/fedcm/canceldialog': {
    POST: {command: 'fedCMCancelDialog'},
  },
  '/session/:sessionId/fedcm/selectaccount': {
    POST: {command: 'fedCMSelectAccount', payloadParams: {required: ['accountIndex']}},
  },
  '/session/:sessionId/fedcm/clickdialogbutton': {
    POST: {command: 'fedCMClickDialogButton', payloadParams: {required: ['dialogButton']}},
  },
  '/session/:sessionId/fedcm/accountlist': {
    GET: {command: 'fedCMGetAccounts'},
  },
  '/session/:sessionId/fedcm/gettitle': {
    GET: {command: 'fedCMGetTitle'},
  },
  '/session/:sessionId/fedcm/getdialogtype': {
    GET: {command: 'fedCMGetDialogType'},
  },
  '/session/:sessionId/fedcm/setdelayenabled': {
    POST: {command: 'fedCMSetDelayEnabled', payloadParams: {required: ['enabled']}},
  },
  '/session/:sessionId/fedcm/resetcooldown': {
    POST: {command: 'fedCMResetCooldown'},
  },
} as const satisfies MethodMap<Driver>;
