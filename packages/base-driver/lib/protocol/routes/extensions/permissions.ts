import type {Driver, MethodMap} from '@appium/types';

/**
 * Permissions.
 * @see https://www.w3.org/TR/permissions/
 */
export const PERMISSIONS_ROUTES = {
  '/session/:sessionId/permissions': {
    POST: {command: 'setPermissions', payloadParams: {required: ['descriptor', 'state']}},
  },
} as const satisfies MethodMap<Driver>;
