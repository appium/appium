/**
 * Small local stand-in for the `http-status-codes` package.
 * Only the codes actually used by this codebase are listed.
 */
export const HTTPStatusCodes = Object.freeze({
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
});
