import {describe, it, beforeEach, afterEach} from 'node:test';
import {expect} from 'chai';
import axios from 'axios';
import {server} from '../../../lib/express/server';
import {LEGACY_TEST_PAGES_ENV} from '../../../lib/test-pages/env';
import {getTestPort, TEST_HOST} from '../../helpers';

describe('legacy test pages gating', function () {
  let previousEnv: string | undefined;

  beforeEach(function () {
    previousEnv = process.env[LEGACY_TEST_PAGES_ENV];
    delete process.env[LEGACY_TEST_PAGES_ENV];
  });

  afterEach(function () {
    if (previousEnv === undefined) {
      delete process.env[LEGACY_TEST_PAGES_ENV];
    } else {
      process.env[LEGACY_TEST_PAGES_ENV] = previousEnv;
    }
  });

  it('should not serve guinea-pig pages by default', async function () {
    const port = await getTestPort(true);
    const hwServer = await server({
      routeConfiguringFunction: () => {},
      port,
    });
    try {
      const {status} = await axios.get(`http://${TEST_HOST}:${port}/test/guinea-pig`, {
        validateStatus: null,
      });
      expect(status).to.equal(404);
    } finally {
      await hwServer.close();
    }
  });

  it('should serve guinea-pig pages when APPIUM_ENABLE_LEGACY_TEST_PAGES is set', async function () {
    process.env[LEGACY_TEST_PAGES_ENV] = '1';
    const port = await getTestPort(true);
    const hwServer = await server({
      routeConfiguringFunction: () => {},
      port,
    });
    try {
      const {data, status} = await axios.get(`http://${TEST_HOST}:${port}/test/guinea-pig`);
      expect(status).to.equal(200);
      expect(data).to.include('I am some page content');
    } finally {
      await hwServer.close();
    }
  });
});
