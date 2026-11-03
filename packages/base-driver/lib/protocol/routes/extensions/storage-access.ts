import type {Driver, MethodMap} from '@appium/types';

/**
 * Storage Access.
 * @see https://privacycg.github.io/storage-access/
 */
export const STORAGE_ACCESS_ROUTES = {
  '/session/:sessionId/storageaccess': {
    POST: {command: 'setStorageAccess', payloadParams: {required: ['blocked', 'origin']}},
  },
} as const satisfies MethodMap<Driver>;
