import path from 'path';
import {fs} from '@appium/support';
import {configureApp} from '../../../lib/basedriver/helpers';
import http from 'http';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import contentDisposition from 'content-disposition';
import B from 'bluebird';
import {TEST_HOST, getTestPort} from '@appium/driver-test-support';

function getFixture(file) {
  // XXX: __dirname disallowed in native ESM
  return path.resolve(__dirname, '..', 'fixtures', file);
}

describe('app download and configuration', function () {
  let expect;

  before(async function () {
    const chai = await import('chai');
    const chaisAsPromised = await import('chai-as-promised');
    chai.use(chaisAsPromised.default);
    expect = chai.expect;
  });

  describe('configureApp', function () {
    it('should get the path for a local .app', async function () {
      let newAppPath = await configureApp(getFixture('FakeIOSApp.app'), '.app');
      expect(newAppPath).to.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      expect(contents).to.eql('this is not really an app\n');
    });
    it('should get the path for a local .apk', async function () {
      let newAppPath = await configureApp(getFixture('FakeAndroidApp.apk'), '.apk');
      expect(newAppPath).to.contain('FakeAndroidApp.apk');
      let contents = await fs.readFile(newAppPath, 'utf8');
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
      let port;
      let serverUrl;

      before(async function () {
        port = await getTestPort(true);
        serverUrl = `http://${TEST_HOST}:${port}`;
      });

      describe('server not available', function () {
        it('should handle server not available', async function () {
          await expect(configureApp(
            `${serverUrl}/FakeIOSApp.app.zip`,
            '.app'
          )).to.eventually.be.rejectedWith(/ECONNREFUSED/);
        });
      });
      describe('server available', function () {
        // use a local server so there is no dependency on the internet
        let server;
        before(function () {
          const dir = path.resolve(__dirname, '..', 'fixtures');
          const serve = serveStatic(dir, {
            index: false,
            setHeaders: (res, path) => {
              res.setHeader('Content-Disposition', contentDisposition(path));
            },
          });

          server = http.createServer(function (req, res) {
            if (req.url.indexOf('missing') !== -1) {
              res.writeHead(404);
              res.end();
              return;
            }
            // for testing zip file content types
            const contentType = new URLSearchParams(new URL(req.url).search).get('content-type');
            if (contentType !== null) {
              res.setHeader('content-type', contentType);
            }
            serve(req, res, finalhandler(req, res));
          });
          const close = server.close.bind(server);
          server.close = async function () {
            // pause a moment or we get ECONRESET errors
            await B.delay(1000);
            return await new B((resolve, reject) => {
              server.on('close', resolve);
              close((err) => {
                if (err) reject(err); // eslint-disable-line curly
              });
            });
          };
          server.listen(port);
        });
        after(async function () {
          await server.close();
        });

        it('should download apk file with query string', async function () {
          let newAppPath = await configureApp(
            `${serverUrl}/FakeAndroidApp.apk?sv=abc&sr=def`,
            '.apk'
          );
          expect(newAppPath).to.contain('.apk');
          let contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an apk\n');
        });
        it('should download an app file', async function () {
          let newAppPath = await configureApp(`${serverUrl}/FakeIOSApp.app`, '.app');
          expect(newAppPath).to.contain('.app');
          let contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an app\n');
        });
        it('should accept multiple extensions', async function () {
          let newAppPath = await configureApp(`${serverUrl}/FakeIOSApp.app`, ['.app', '.aab']);
          expect(newAppPath).to.contain('FakeIOSApp.app');
          let contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an app\n');
        });
        it('should download an apk file', async function () {
          let newAppPath = await configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk');
          expect(newAppPath).to.contain('.apk');
          let contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an apk\n');
        });
        it('should handle zip file that cannot be downloaded', async function () {
          await expect(configureApp(`${serverUrl}/missing/FakeIOSApp.app.zip`, '.app')).to.eventually.be
            .rejected;
        });
        it('should handle invalid protocol', async function () {
          await expect(configureApp(
            'file://C:/missing/FakeIOSApp.app.zip',
            '.app'
          )).to.eventually.be.rejectedWith(/is not supported/);
          await expect(configureApp(
            `ftp://${TEST_HOST}:${port}/missing/FakeIOSApp.app.zip`,
            '.app'
          )).to.eventually.be.rejectedWith(/is not supported/);
        });
        it('should handle missing file in Windows path format', async function () {
          await expect(configureApp(
            'C:\\missing\\FakeIOSApp.app.zip',
            '.app'
          )).to.eventually.be.rejectedWith(/does not exist or is not accessible/);
        });
        it('should treat an unknown mime type as an app', async function () {
          let newAppPath = await configureApp(
            `${serverUrl}/FakeAndroidApp.apk?content-type=${encodeURIComponent('application/bip')}`,
            '.apk'
          );
          expect(newAppPath).to.contain('.apk');
          let contents = await fs.readFile(newAppPath, 'utf8');
          expect(contents).to.eql('this is not really an apk\n');
        });
      });
    });
  });
});
