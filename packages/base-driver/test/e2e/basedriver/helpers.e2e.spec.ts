import path from 'node:path';
import {fs} from '@appium/support';

import {configureApp} from '../../../lib/basedriver/helpers';
import http from 'node:http';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import contentDisposition from 'content-disposition';
import {sleep} from 'asyncbox';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';

chai.use(chaiAsPromised);

function getFixture(file: string): string {
  return path.resolve(__dirname, '..', 'fixtures', file);
}

describe('app download and configuration', function () {
  describe('configureApp', function () {
    it('should get the path for a local .app', async function () {
      const newAppPath = await configureApp(getFixture('FakeIOSApp.app'), '.app');
      expect(newAppPath).to.contain('FakeIOSApp.app');
      const contents = await fs.readFile(newAppPath, 'utf8');
      expect(contents).to.eql('this is not really an app\n');
    });
    it('should get the path for a local .apk', async function () {
      const newAppPath = await configureApp(getFixture('FakeAndroidApp.apk'), '.apk');
      expect(newAppPath).to.contain('FakeAndroidApp.apk');
      const contents = await fs.readFile(newAppPath, 'utf8');
      expect(contents).to.eql('this is not really an apk\n');
    });
    it('should fail if extensions do not match', async function () {
      await expect(configureApp(getFixture('FakeIOSApp.app'), '.wrong')).to.be.rejectedWith(
        /did not have extension/
      );
    });
    it('should fail if zip file does not contain an app whose extension matches', async function () {
      await expect(configureApp(getFixture('FakeIOSApp.app.zip'), '.wrong')).to.be.rejectedWith(
        /did not have extension/
      );
    });
    describe('should download an app from the web', function () {
      let port: number;
      let serverUrl: string;

      before(async function () {
        port = await getTestPort(true);
        serverUrl = `http://${TEST_HOST}:${port}`;
      });

      describe('server not available', function () {
        it('should handle server not available', async function () {
          await expect(
            configureApp(`${serverUrl}/FakeIOSApp.app.zip`, '.app')
          ).to.eventually.be.rejectedWith(/ECONNREFUSED/);
        });
      });
      describe('server available', function () {
        // use a local server so there is no dependency on the internet
        type HttpServerWithAsyncClose = http.Server & {close(): Promise<void>};
        let server: HttpServerWithAsyncClose;

        before(function () {
          const dir = path.resolve(__dirname, '..', 'fixtures');
          const serve = serveStatic(dir, {
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
            // for testing zip file content types
            const contentType = new URLSearchParams(
              new URL(req.url ?? '', 'http://localhost').search
            ).get('content-type');
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
          const newAppPath = await configureApp(
            `${serverUrl}/FakeAndroidApp.apk?sv=abc&sr=def`,
            '.apk'
          );
          expect(newAppPath).to.contain('.apk');
          const contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an apk\n');
        });
        it('should download an app file', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeIOSApp.app`, '.app');
          expect(newAppPath).to.contain('.app');
          const contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an app\n');
        });
        it('should accept multiple extensions', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeIOSApp.app`, ['.app', '.aab']);
          expect(newAppPath).to.contain('FakeIOSApp.app');
          const contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an app\n');
        });
        it('should download an apk file', async function () {
          const newAppPath = await configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk');
          expect(newAppPath).to.contain('.apk');
          const contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an apk\n');
        });
        it('should handle zip file that cannot be downloaded', async function () {
          await expect(
            configureApp(`${serverUrl}/missing/FakeIOSApp.app.zip`, '.app')
          ).to.eventually.be.rejected;
        });
        it('should handle invalid protocol', async function () {
          await expect(
            configureApp('file://C:/missing/FakeIOSApp.app.zip', '.app')
          ).to.eventually.be.rejectedWith(/is not supported/);
          await expect(
            configureApp(`ftp://${TEST_HOST}:${port}/missing/FakeIOSApp.app.zip`, '.app')
          ).to.eventually.be.rejectedWith(/is not supported/);
        });
        it('should handle missing file in Windows path format', async function () {
          await expect(
            configureApp('C:\\missing\\FakeIOSApp.app.zip', '.app')
          ).to.eventually.be.rejectedWith(/does not exist or is not accessible/);
        });
        it('should treat an unknown mime type as an app', async function () {
          const newAppPath = await configureApp(
            `${serverUrl}/FakeAndroidApp.apk?content-type=${encodeURIComponent('application/bip')}`,
            '.apk'
          );
          expect(newAppPath).to.contain('.apk');
          const contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an apk\n');
        });
      });
    });
  });
});
