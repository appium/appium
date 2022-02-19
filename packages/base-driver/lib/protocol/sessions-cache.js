import LRU from 'lru-cache';
import { logger } from '@appium/support';
import { PROTOCOLS } from '../constants';

const GENERIC_PROTOCOL = 'GENERIC';
const mjsonwpLog = logger.getLogger('MJSONWP');
const w3cLog = logger.getLogger('W3C');
const genericProtocolLog = logger.getLogger(GENERIC_PROTOCOL);


function getDefaultLogger (protocol) {
  switch (protocol) {
    case PROTOCOLS.W3C:
      return w3cLog;
    case PROTOCOLS.MJSONWP:
      return mjsonwpLog;
    default:
      return genericProtocolLog;
  }
}


class SessionsCache {
  constructor (max) {
    this._cache = new LRU({ max });
  }

  getLogger (sessionId, defaultProtocol = null) {
    if (!sessionId) {
      // Fall back to protocol name-only logger if session id is unknown
      return getDefaultLogger(defaultProtocol);
    }

    let logProtocol;
    if (this._cache.has(sessionId)) {
      const value = this._cache.get(sessionId);
      const log = value.logger.get(sessionId);
      if (log) {
        return log;
      }
      logProtocol = value.protocol || defaultProtocol || GENERIC_PROTOCOL;
    } else {
      logProtocol = defaultProtocol || GENERIC_PROTOCOL;
    }
    // Always create a new logger instance for ids
    // that are not in the current sessions list,
    // so we can still see such ids as prefixes
    return logger.getLogger(`${logProtocol} (${sessionId.substring(0, Math.min(sessionId.length, 8))})`);
  }

  getProtocol (sessionId) {
    return this._cache.get(sessionId)?.protocol;
  }

  putSession (sessionId, protocol) {
    if (!sessionId || !protocol) {
      return;
    }

    // This would probably look better if WeakRef was available
    const item = { protocol, logger: new WeakMap() };
    item.logger.put(sessionId, this.getLogger(sessionId, protocol));
    this._cache.set(sessionId, item);
  }
}

// This cache is useful when a session gets terminated
// and removed from the sessions list in the umbrella driver,
// but the client still tries to send a command to this session id.
// So we know how to properly wrap the error message for it
const SESSIONS_CACHE = new SessionsCache(100);

export default SESSIONS_CACHE;
