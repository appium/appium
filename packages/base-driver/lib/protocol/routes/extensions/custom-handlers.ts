import type {Driver, MethodMap} from '@appium/types';

/**
 * Custom Handlers (user-agent automation).
 * @see https://html.spec.whatwg.org/multipage/system-state.html#user-agent-automation
 */
export const CUSTOM_HANDLERS_ROUTES = {
  '/session/:sessionId/custom-handlers/set-mode': {
    POST: {command: 'setRPHRegistrationMode', payloadParams: {required: ['mode']}},
  },
} as const satisfies MethodMap<Driver>;
