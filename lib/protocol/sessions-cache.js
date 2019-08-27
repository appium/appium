import LRU from 'lru-cache';
import { logger } from 'appium-support';
import { PROTOCOLS } from '.';


const GENERIC_PROTOCOL = 'GENERIC';
const mjsonwpLog = logger.getLogger('MJSONWP');
const w3cLog = logger.getLogger('W3C');
const genericProtocolLog = logger.getLogger(GENERIC_PROTOCOL);


class SessionsCache {
  constructor (max) {
    this._cache = new LRU({ max });
  }

  getLogger (sessionId, protocol) {
    if (sessionId) {
      if (this._cache.has(sessionId)) {
        const value = this._cache.get(sessionId);
        if (value.logger) {
          return value.logger;
        }
        protocol = protocol || value.protocol;
      }
      // Always create a new logger instance for ids
      // that are not in the current sessions list,
      // so we can still see such ids as prefixes
      return logger.getLogger(`${protocol || GENERIC_PROTOCOL} ` +
        `(${sessionId.substring(0, Math.min(sessionId.length, 8))})`);
    }

    // Fall back to protocol name-only logger if session id is unknown
    switch (protocol) {
      case PROTOCOLS.W3C:
        return w3cLog;
      case PROTOCOLS.MJSONWP:
        return mjsonwpLog;
      default:
        return genericProtocolLog;
    }
  }

  getProtocol (sessionId) {
    return (this._cache.get(sessionId) || {}).protocol;
  }

  putSession (sessionId, value) {
    if (sessionId && value) {
      this._cache.set(sessionId, {
        protocol: value,
        // We don't want to cache the logger instance for each random session id in the cache
        // in order to save memory. Instead we only cache loggers for valid ids that
        // are returned by `createSession` call and reset them after `deleteSession` is called
        logger: this.getLogger(sessionId, value),
      });
    }
    return value;
  }

  resetLogger (sessionId) {
    if (this._cache.has(sessionId)) {
      this._cache.get(sessionId).logger = null;
    }
  }
}

// This cache is useful when a session gets terminated
// and removed from the sessions list in the umbrella driver,
// but the client still tries to send a command to this session id.
// So we know how to properly wrap the error message for it
const SESSIONS_CACHE = new SessionsCache(100);

export default SESSIONS_CACHE;
