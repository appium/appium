import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C Secure Payment Confirmation.
 * @see https://www.w3.org/TR/secure-payment-confirmation/
 */
export const W3C_PAYMENT_ROUTES = {
  '/session/:sessionId/secure-payment-confirmation/set-mode': {
    POST: {command: 'setSPCTransactionMode', payloadParams: {required: ['mode']}},
  },
} as const satisfies MethodMap<Driver>;
