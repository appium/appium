import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {after, afterEach, before, describe, it} from 'node:test';

import {getTestPort, TEST_HOST} from '@appium/driver-test-support';
import {fs, node} from '@appium/support';
import {sleep} from 'asyncbox';
import contentDisposition from 'content-disposition';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';

import {configureAppUrlRules} from '../../../lib/basedriver/commands/app-url-rules.js';
import {DriverCore} from '../../../lib/basedriver/core.js';
import {configureApp} from '../../../lib/basedriver/helpers.js';

const driver = new DriverCore();
const applyAppUrlRules = (rules?: Parameters<typeof configureAppUrlRules>[0] | null) =>
  configureAppUrlRules.call(driver, rules);

const FIXTURE_ROOT = path.resolve(
  node.getModuleRootSync('@appium/base-driver', import.meta.filename)!,
  'test',
  'e2e',
  'fixtures',
);

function getFixture(file: string): string {
  return path.resolve(FIXTURE_ROOT, file);
}

describe('app download and configuration', function () {
  describe('configureApp', function () {
    it('should get the path for a local .app', async function () {
      const newAppPath = await configureApp(getFixture('FakeIOSApp.app'), '.app');
      assert.ok(newAppPath.includes('FakeIOSApp.app'));
      const contents = await fs.readFile(newAppPath, 'utf8');
      assert.strictEqual(contents, 'this is not really an app\n');
    });
    it('should get the path for a local .apk', async function () {
      const newAppPath = await configureApp(getFixture('FakeAndroidApp.apk'), '.apk');
      assert.ok(newAppPath.includes('FakeAndroidApp.apk'));
      const contents = await fs.readFile(newAppPath, 'utf8');
      assert.strictEqual(contents, 'this is not really an apk\n');
    });
    it('should fail if extensions do not match', async function () {
      await assert.rejects(configureApp(getFixture('FakeIOSApp.app'), '.wrong'), /did not have extension/);
    });
    it('should fail if zip file does not contain an app whose extension matches', async function () {
      await assert.rejects(configureApp(getFixture('FakeIOSApp.app.zip'), '.wrong'), /did not have extension/);
    });
    describe('should download an app from the web', function () {
      let port: number;
      let serverUrl: string;

      before(async function () {
        port = await getTestPort();
        serverUrl = `http://${TEST_HOST}:${port}`;
      });

      describe('server not available', function () {
        it('should handle server not available', async function () {
          await assert.rejects(configureApp(`${serverUrl}/FakeIOSApp.app.zip`, '.app'), /ECONNREFUSED/);
        });
      });
      describe('server available', function () {
        // use a local server so there is no dependency on the internet
        type HttpServerWithAsyncClose = http.Server & {close(): Promise<void>};
        let server: HttpServerWithAsyncClose;

        before(function () {
          const serve = serveStatic(FIXTURE_ROOT, {
            index: false,
            setHeaders: (res, filePath) => {
              res.setHeader('Content-Disposition', contentDisposition(filePath));
            },
          });

          const httpServer = http.createServer(function (req, res) {
            if (req.url?.indexOf('missing') !== -1) {
              res.writeHead(404);
              res.end();
              return;
            }
            // `/redirect/<n>/<file>` redirects `n` times before serving `<file>`
            const redirectMatch = /^\/redirect\/(\d+)\/(.+)$/.exec(req.url ?? '');
            if (redirectMatch) {
              const hopsLeft = parseInt(redirectMatch[1], 10) - 1;
              const location = hopsLeft > 0 ? `/redirect/${hopsLeft}/${redirectMatch[2]}` : `/${redirectMatch[2]}`;
              res.writeHead(302, {Location: location});
              res.end();
              return;
            }
            // for testing zip file content types
            const contentType = new URLSearchParams(new URL(req.url ?? '', 'http://localhost').search).get(
              'content-type',
            );
            if (contentType !== null) {
              res.setHeader('content-type', contentType);
            }
            serve(req, res, finalhandler(req, res));
          });
          const close = httpServer.close.bind(httpServer);
          // Replace close with async version; type assertion needed for method replacement
          (httpServer as unknown as Record<string, () => Promise<void>>).close = async function () {
            // pause a moment or we get ECONRESET errors
            await sleep(1000);
            return await new Promise<void>((resolve, reject) => {
              httpServer.on('close', resolve);
              close((err: Error | undefined) => {
                if (err) {
                  reject(err);
                }
              });
            });
          };
          httpServer.listen(port);
          server = httpServer as HttpServerWithAsyncClose;
        });
        after(async function () {
          await server.close();
        });

        it('should download apk file with query string', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeAndroidApp.apk?sv=abc&sr=def`, '.apk');
          assert.ok(newAppPath.includes('.apk'));
          const contents = await fs.readFile(newAppPath, 'utf8');
          assert.strictEqual(contents, 'this is not really an apk\n');
        });
        it('should download an app file', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeIOSApp.app`, '.app');
          assert.ok(newAppPath.includes('.app'));
          const contents = await fs.readFile(newAppPath, 'utf8');
          assert.strictEqual(contents, 'this is not really an app\n');
        });
        it('should accept multiple extensions', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeIOSApp.app`, ['.app', '.aab']);
          assert.ok(newAppPath.includes('FakeIOSApp.app'));
          const contents = await fs.readFile(newAppPath, 'utf8');
          assert.strictEqual(contents, 'this is not really an app\n');
        });
        it('should download an apk file', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk');
          assert.ok(newAppPath.includes('.apk'));
          const contents = await fs.readFile(newAppPath, 'utf8');
          assert.strictEqual(contents, 'this is not really an apk\n');
        });
        it('should handle zip file that cannot be downloaded', async function () {
          await assert.rejects(configureApp(`${serverUrl}/missing/FakeIOSApp.app.zip`, '.app'));
        });
        it('should handle invalid protocol', async function () {
          await assert.rejects(configureApp('file://C:/missing/FakeIOSApp.app.zip', '.app'), /is not supported/);
          await assert.rejects(
            configureApp(`ftp://${TEST_HOST}:${port}/missing/FakeIOSApp.app.zip`, '.app'),
            /is not supported/,
          );
        });
        it('should handle missing file in Windows path format', async function () {
          await assert.rejects(
            configureApp('C:\\missing\\FakeIOSApp.app.zip', '.app'),
            /does not exist or is not accessible/,
          );
        });
        it('should follow redirects', async function () {
          const newAppPath = await configureApp(`${serverUrl}/redirect/2/FakeAndroidApp.apk`, '.apk');
          assert.ok(newAppPath.includes('.apk'));
          const contents = await fs.readFile(newAppPath, 'utf8');
          assert.strictEqual(contents, 'this is not really an apk\n');
        });
        describe('with app URL rules', function () {
          afterEach(function () {
            applyAppUrlRules();
          });

          it('should download an app whose URL satisfies the rules', async function () {
            applyAppUrlRules({allow: [new URL(serverUrl).hostname], maxRedirects: 2});
            const newAppPath = await configureApp(`${serverUrl}/redirect/2/FakeAndroidApp.apk`, '.apk');
            assert.ok(newAppPath.includes('.apk'));
            const contents = await fs.readFile(newAppPath, 'utf8');
            assert.strictEqual(contents, 'this is not really an apk\n');
          });
          it('should apply address rules to dynamically resolved hostnames', async function () {
            applyAppUrlRules({allow: ['127.0.0.0/8']});
            const newAppPath = await configureApp(`http://localhost:${port}/FakeAndroidApp.apk`, '.apk');
            assert.ok(newAppPath.includes('.apk'));
          });
          it('should reject a URL not matching any allow rule', async function () {
            applyAppUrlRules({allow: ['apps.example.com']});
            await assert.rejects(
              configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk'),
              /is not allowed by the server configuration: the IP address does not match any allow rule/,
            );
          });
          it('should reject a URL matching a deny rule', async function () {
            applyAppUrlRules({deny: [new URL(serverUrl).hostname]});
            await assert.rejects(
              configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk'),
              /is not allowed by the server configuration: the IP address matches a deny rule/,
            );
          });
          it('should reject a non-https URL if httpsOnly is set', async function () {
            applyAppUrlRules({httpsOnly: true});
            await assert.rejects(
              configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk'),
              /is not allowed by the server configuration: only https: URLs are accepted/,
            );
          });
          it('should reject a URL with credentials if allowCredentials is false', async function () {
            applyAppUrlRules({allowCredentials: false});
            await assert.rejects(
              configureApp(`http://user:pass@${TEST_HOST}:${port}/FakeAndroidApp.apk`, '.apk'),
              /is not allowed by the server configuration: URLs containing credentials are not accepted/,
            );
          });
          it('should reject a download exceeding maxRedirects', async function () {
            applyAppUrlRules({maxRedirects: 1});
            await assert.rejects(configureApp(`${serverUrl}/redirect/2/FakeAndroidApp.apk`, '.apk'), /redirect/i);
          });
          it('should reject any redirect if maxRedirects is 0', async function () {
            applyAppUrlRules({maxRedirects: 0});
            await assert.rejects(configureApp(`${serverUrl}/redirect/1/FakeAndroidApp.apk`, '.apk'), /Cannot download/);
          });
        });
        it('should treat an unknown mime type as an app', async function () {
          const newAppPath = await configureApp(
            `${serverUrl}/FakeAndroidApp.apk?content-type=${encodeURIComponent('application/bip')}`,
            '.apk',
          );
          assert.ok(newAppPath.includes('.apk'));
          const contents = await fs.readFile(newAppPath, 'utf8');
          assert.strictEqual(contents, 'this is not really an apk\n');
        });
      });
    });
  });
});
