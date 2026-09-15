export const MIN_WS_CODE_VAL = 1000;
export const MAX_WS_CODE_VAL = 1015;
// codes reserved by RFC 6455 -- never valid to send explicitly in a close frame, even though
// they fall within [MIN_WS_CODE_VAL, MAX_WS_CODE_VAL] and can be *received* from a peer
export const RESERVED_WS_CODES: ReadonlySet<number> = new Set([1004, 1005, 1006, 1015]);
export const WS_FALLBACK_CODE = 1011; // server encountered an error while fulfilling request
export const MAX_LOGGED_DATA_LENGTH = 300;
export const SESSION_SUBSCRIBE = 'session.subscribe';
export const SESSION_UNSUBSCRIBE = 'session.unsubscribe';
