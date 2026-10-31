import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {PROTOCOLS} from '../../../lib/constants.js';
import {isProtocolResponseEnvelope} from '../../../lib/protocol/helpers.js';

describe('isProtocolResponseEnvelope', function () {
  it('rejects script results that contain a protocol field', function () {
    assert.equal(
      isProtocolResponseEnvelope({href: 'https://example.com/home', host: 'example.com', protocol: 'https:'}),
      false,
    );
    assert.equal(isProtocolResponseEnvelope({protocol: 'https:', value: 'https://example.com/home'}), false);
  });

  it('accepts a W3C value or error envelope', function () {
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.W3C, value: {host: 'example.com'}}), true);
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.W3C, error: new Error('failed')}), true);
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.MJSONWP, value: null}), true);
  });

  it('accepts the handler wrapper whose protocol has not been set', function () {
    assert.equal(isProtocolResponseEnvelope({value: {ready: true}, error: undefined, protocol: undefined}), true);
  });

  it('rejects objects that only share part of the envelope shape', function () {
    assert.equal(isProtocolResponseEnvelope({protocol: PROTOCOLS.W3C}), false);
    assert.equal(isProtocolResponseEnvelope({value: {ready: true}}), false);
    assert.equal(isProtocolResponseEnvelope(null), false);
    assert.equal(isProtocolResponseEnvelope(['https']), false);
  });
});
