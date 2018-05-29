import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import { fs } from 'appium-support';
import h from '../../lib/basedriver/helpers';
import http from 'http';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import contentDisposition from 'content-disposition';
import B from 'bluebird';


chai.should();
chai.use(chaiAsPromised);

function getFixture (file) {
  return path.resolve(__dirname, '..', '..', '..', 'test', 'basedriver',
                      'fixtures', file);
}

describe('app download and configuration', function () {
  describe('configureApp', function () {
    it('should get the path for a local .app', async function () {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.app'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should get the path for a local .apk', async function () {
      let newAppPath = await h.configureApp(getFixture('FakeAndroidApp.apk'), '.apk');
      newAppPath.should.contain('FakeAndroidApp.apk');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an apk\n');
    });
    it('should unzip and get the path for a local .app.zip', async function () {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.app.zip'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should unzip and get the path for a local .ipa', async function () {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.ipa'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should fail for a bad zip file', async function () {
      await h.configureApp(getFixture('BadZippedApp.zip'), '.app')
        .should.be.rejectedWith('Error testing zip archive, are you sure this is a zip file?');
    });
    it('should fail if extensions do not match', async function () {
      await h.configureApp(getFixture('FakeIOSApp.app'), '.wrong')
        .should.be.rejectedWith(/did not have extension '.wrong'/);
    });
    it('should fail if zip file does not contain an app whose extension matches', async function () {
      await h.configureApp(getFixture('FakeIOSApp.app.zip'), '.wrong')
        .should.be.rejectedWith(/could not find a .wrong bundle in it/);
    });
    describe('should download an app from the web', async function () {
      const port = 8000;
      const serverUrl = `http://localhost:${port}`;

      describe('server not available', function () {
        it('should handle server not available', async function () {
          await h.configureApp(`${serverUrl}/FakeIOSApp.app.zip`, '.app')
            .should.eventually.be.rejectedWith(/ECONNREFUSED/);
        });
      });
      describe('server available', function () {
        // use a local server so there is no dependency on the internet
        let server;
        before(function () {
          const dir = path.resolve(__dirname, '..', '..', '..', 'test',
                                   'basedriver', 'fixtures');
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
            if (req.url.indexOf('mime-zip') !== -1) {
              res.setHeader('content-type', 'application/zip');
            } else if (req.url.indexOf('mime-bip') !== 1) {
              res.setHeader('content-type', 'application/bip');
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

        it('should download zip file', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeIOSApp.app.zip`, '.app');
          newAppPath.should.contain('FakeIOSApp.app');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an app\n');
        });
        it('should download zip file with query string', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeIOSApp.app.zip?sv=abc&sr=def`, '.app');
          newAppPath.should.contain('.app');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an app\n');
        });
        it('should download an app file', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeIOSApp.app`, '.app');
          newAppPath.should.contain('.app');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an app\n');
        });
        it('should download an apk file', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeAndroidApp.apk`, '.apk');
          newAppPath.should.contain('.apk');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an apk\n');
        });
        it('should handle zip file that cannot be downloaded', async function () {
          await h.configureApp(`${serverUrl}/missing/FakeIOSApp.app.zip`, '.app')
            .should.eventually.be.rejectedWith(/Problem downloading app from url/);
        });
        it('should handle invalid protocol', async function () {
          await h.configureApp('file://C:/missing/FakeIOSApp.app.zip', '.app')
            .should.eventually.be.rejectedWith(/is not supported/);
          await h.configureApp('ftp://localhost:8000/missing/FakeIOSApp.app.zip', '.app')
            .should.eventually.be.rejectedWith(/is not supported/);
        });
        it('should handle missing file in Windows path format', async function () {
          await h.configureApp('C:\\missing\\FakeIOSApp.app.zip', '.app')
            .should.eventually.be.rejectedWith(/does not exist or is not accessible/);
        });
        it('should recognize zip mime types and unzip the downloaded file', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeAndroidApp.asd?mime-zip`, '.apk');
          newAppPath.should.contain('FakeAndroidApp.apk');
          newAppPath.should.not.contain('.asd');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an apk\n');
        });
        it('should recognize zip mime types and unzip the downloaded file with query string', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeAndroidApp.asd?mime-zip&sv=abc&sr=def`, '.apk');
          newAppPath.should.contain('FakeAndroidApp.apk');
          newAppPath.should.not.contain('.asd');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an apk\n');
        });
        it('should treat an unknown mime type as an app', async function () {
          let newAppPath = await h.configureApp(`${serverUrl}/FakeAndroidApp.apk?mime-bip`, '.apk');
          newAppPath.should.contain('.apk');
          let contents = await fs.readFile(newAppPath, 'utf8');
          contents.should.eql('this is not really an apk\n');
        });
      });
    });
  });
});
