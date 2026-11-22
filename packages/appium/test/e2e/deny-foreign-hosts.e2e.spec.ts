import assert from 'node:assert/strict';
import http from 'node:http';
import {describe, it, before, after} from 'node:test';

import {fs, tempDir} from '@appium/support';
import * as semver from 'semver';
import {SubProcess} from 'teen_process';

import {npmPackage} from '../../lib/utils/index.js';
import {getTestPort} from '../helpers.js';
import {EXECUTABLE} from './e2e-helpers.js';

const MIN_NODE_VERSION = (npmPackage.engines as Record<string, string>).node;

/**
 * Exercises the `server()` wiring end to end: the `denyForeignHosts` CLI arg
 * and the derived `allowedHostnames` must reach the HTTP server, so a request
 * addressed to the configured hostname is served while a request whose Host
 * header names something else is rejected before it reaches the API.
 */
// pick describe or skip at declaration time, so the before hook never runs on
// an unsupported Node (the server would exit immediately)
const describeIfNodeSupported = semver.satisfies(process.version, MIN_NODE_VERSION) ? describe : describe.skip;

describeIfNodeSupported('deny-foreign-hosts server wiring', function () {
  let appiumHome: string;
  let serverProcess: SubProcess | undefined;
  let port: number;

  before(async function () {
    appiumHome = await tempDir.openDir();
    port = await getTestPort();

    serverProcess = new SubProcess(
      process.execPath,
      [EXECUTABLE, '--address', '127.0.0.1', '--port', String(port), '--deny-foreign-hosts', '--log-level', 'debug'],
      {
        env: {APPIUM_HOME: appiumHome, PATH: process.env.PATH},
      },
    );
    await serverProcess.start();

    // wait for the server to accept connections
    const deadline = Date.now() + 30000;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
      try {
        await request(port, '127.0.0.1');
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    if (lastError) {
      throw lastError;
    }
  });

  after(async function () {
    if (serverProcess) {
      try {
        await serverProcess.stop();
      } catch {
        // already gone
      }
    }
    await fs.rimraf(appiumHome);
  });

  function request(port: number, host: string, path = '/status'): Promise<{status: number; body: string}> {
    return new Promise((resolve, reject) => {
      const req = http.request({host: '127.0.0.1', port, path, headers: {host, accept: 'application/json'}}, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += String(chunk);
        });
        res.on('end', () => resolve({status: res.statusCode ?? 0, body}));
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('should serve a request addressed to the configured hostname', async function () {
    const {status} = await request(port, '127.0.0.1');
    assert.strictEqual(status, 200);
  });

  it('should reject a request whose Host header names a foreign host', async function () {
    const {status, body} = await request(port, 'evil.example');
    assert.strictEqual(status, 403);
    assert.ok(body.includes('Invalid Host header'));
  });
});
