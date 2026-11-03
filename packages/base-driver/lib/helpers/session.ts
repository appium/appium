/**
 * Extract the first 8 characters of session ID to prefix the log.
 *
 * @param sessionId session identifier
 */
export function calcSignature(sessionId: string): string {
  return sessionId.substring(0, 8);
}
