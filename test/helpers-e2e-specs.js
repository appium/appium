import chai from 'chai';
import path from 'path';
import chaiAsPromised from 'chai-as-promised';
import { fs } from 'appium-support';
import h from '../lib/helpers';
import http from 'http';
import finalhandler from 'finalhandler';
import serveStatic from 'serve-static';
import contentDisposition from 'content-disposition';


chai.should();
chai.use(chaiAsPromised);

function getFixture (file) {
  return path.resolve(__dirname, '..', '..', 'test', 'fixtures', file);
}

describe('app download and configuration', () => {
  describe('configureApp', () => {
    it('should get the path for a local .app', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.app'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should get the path for a local .apk', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeAndroidApp.apk'), '.apk');
      newAppPath.should.contain('FakeAndroidApp.apk');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an apk\n');
    });
    it('should unzip and get the path for a local .app.zip', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.app.zip'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should unzip and get the path for a local .ipa', async () => {
      let newAppPath = await h.configureApp(getFixture('FakeIOSApp.ipa'), '.app');
      newAppPath.should.contain('FakeIOSApp.app');
      let contents = await fs.readFile(newAppPath, 'utf8');
      contents.should.eql('this is not really an app\n');
    });
    it('should fail for a bad zip file', async () => {
      await h.configureApp(getFixture('BadZippedApp.zip'), '.app')
        .should.be.rejectedWith('Error testing zip archive, are you sure this is a zip file?');
    });
    it('should fail if extensions do not match', async () => {
      await h.configureApp(getFixture('FakeIOSApp.app'), '.wrong')
        .should.be.rejectedWith(/did not have extension .wrong/);
    });
    it('should fail if zip file does not contain an app whose extension matches', async () => {
      await h.configureApp(getFixture('FakeIOSApp.app.zip'), '.wrong')
        .should.be.rejectedWith(/could not find a .wrong bundle in it/);
    });
    describe('should download an app from the web', async () => {
      // use a local server so there is no dependency on the internet
      let server;
      before(() => {
        let dir = path.resolve(__dirname, '..', '..', 'test', 'fixtures');
        let serve = serveStatic(dir, {
          index: false,
          setHeaders: function (res, path) {
            res.setHeader('Content-Disposition', contentDisposition(path));
          }
        });

        server = http.createServer(function (req, res) {
          if (req.url.indexOf('missing') !== -1) {
            res.writeHead(404);
            res.end();
            return;
          }
          serve(req, res, finalhandler(req, res));
        });
        server.listen(8000);
      });
      after(() => {
        server.close();
      });

      it('should download zip file', async () => {
        let newAppPath = await h.configureApp('http://localhost:8000/FakeIOSApp.app.zip', '.app');
        newAppPath.should.contain('FakeIOSApp.app');
        let contents = await fs.readFile(newAppPath, 'utf8');
        contents.should.eql('this is not really an app\n');
      });
      it('should handle zip file that cannot be downloaded', async () => {
        await h.configureApp('http://localhost:8000/missing/FakeIOSApp.app.zip', '.app')
          .should.be.rejectedWith(/Problem downloading app from url/);
      });
      it('should handle server not available', async () => {
        server.close();
        await h.configureApp('http://localhost:8000/FakeIOSApp.app.zip', '.app')
          .should.be.rejectedWith(/ECONNREFUSED/);
      });
    });
  });
});
