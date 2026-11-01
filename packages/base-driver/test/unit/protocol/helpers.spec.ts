import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {PROTOCOLS} from '../../../lib/constants.js';
import {isProtocolResponseEnvelope, responseEnvelope} from '../../../lib/protocol/helpers.js';

describe('isProtocolResponseEnvelope', function () {
  it('rejects script results that contain a protocol field', function () {
    assert.equal(
      isProtocolResponseEnvelope({href: 'https://example.com/home', host: 'example.com', protocol: 'https:'}),
      false,
    );
    assert.equal(isProtocolResponseEnvelope({protocol: 'https:', value: 'https://example.com/home'}), false);
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.W3C, value: 5}), false);
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.MJSONWP, value: {host: 'example.com'}}), false);
  });

  it('accepts a marked envelope or a returned error', function () {
    assert.equal(
      isProtocolResponseEnvelope(responseEnvelope({protocol: PROTOCOLS.W3C, value: {host: 'example.com'}})),
      true,
    );
    assert.equal(
      isProtocolResponseEnvelope(responseEnvelope({protocol: PROTOCOLS.MJSONWP, value: {host: 'example.com'}})),
      true,
    );
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.W3C, error: new Error('failed')}), true);
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.MJSONWP, error: new Error('failed')}), true);
  });

  it('rejects objects that only share part of the envelope shape', function () {
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.W3C}), false);
    assert.equal(isProtocolResponseEnvelope({value: {ready: true}}), false);
    assert.equal(isProtocolResponseEnvelope(null), false);
    assert.equal(isProtocolResponseEnvelope(['https']), false);
  });
});
