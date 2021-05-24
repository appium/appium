import _ from 'lodash';
import { mjpeg } from '..';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import http from 'http';
import mJpegServer from 'mjpeg-server';

const {MJpegStream} = mjpeg;

const TEST_IMG_JPG = '/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/4QOBaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MCA3OS4xNjA0NTEsIDIwMTcvMDUvMDYtMDE6MDg6MjEgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6NGY5ODc1OTctZGE2My00Y2M0LTkzNDMtNGYyNjgzMGUwNjk3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjlDMzI3QkY0N0Q3NTExRThCMTlDOTVDMDc2RDE5MDY5IiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjlDMzI3QkYzN0Q3NTExRThCMTlDOTVDMDc2RDE5MDY5IiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NGY5ODc1OTctZGE2My00Y2M0LTkzNDMtNGYyNjgzMGUwNjk3IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjRmOTg3NTk3LWRhNjMtNGNjNC05MzQzLTRmMjY4MzBlMDY5NyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pv/uAA5BZG9iZQBkwAAAAAH/2wCEABALCwsMCxAMDBAXDw0PFxsUEBAUGx8XFxcXFx8eFxoaGhoXHh4jJSclIx4vLzMzLy9AQEBAQEBAQEBAQEBAQEABEQ8PERMRFRISFRQRFBEUGhQWFhQaJhoaHBoaJjAjHh4eHiMwKy4nJycuKzU1MDA1NUBAP0BAQEBAQEBAQEBAQP/AABEIACAAIAMBIgACEQEDEQH/xABgAAEAAwEAAAAAAAAAAAAAAAAABAUHCAEBAAAAAAAAAAAAAAAAAAAAABAAAQMCAgsAAAAAAAAAAAAAAAECBBEDEgYhMRODo7PTVAUWNhEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Az8AAdAAAAAAI8+fE8dEuTZtzZR7VMb6OdTE5GJoYirrUp/e8qd9wb3TGe/lJ2551sx8D/9k=';

const should = chai.should();
chai.use(chaiAsPromised);

const MJPEG_SERVER_PORT = 8589;
const MJPEG_SERVER_URL = `http://localhost:${MJPEG_SERVER_PORT}`;


/**
 * Start an mjpeg server for the purpose of testing, which just sends the same
 * image over and over. Caller is responsible for closing the server.
 * @param {int} port - port the server should listen on
 * @param {int} [intMs] - how often the server should push an image
 * @param {int} [times] - how many times the server should push an image before
 * it closes the connection
 * @returns {http.Server}
 */
function initMJpegServer (port, intMs = 300, times = 20) {
  const server = http.createServer(async function (req, res) {
    const mJpegReqHandler = mJpegServer.createReqHandler(req, res);
    const jpg = Buffer.from(TEST_IMG_JPG, 'base64');

    // just send the same jpeg over and over
    for (let i = 0; i < times; i++) {
      await B.delay(intMs);
      mJpegReqHandler._write(jpg, null, _.noop);
    }
    mJpegReqHandler.close();
  }).listen(port);

  return server;
}


describe('MJpeg Stream (e2e)', function () {
  let mJpegServer, stream;

  before(async function () {
    // TODO: remove when buffertools can handle v12
    if (process.version.startsWith('v12')) {
      return this.skip();
    }

    mJpegServer = await initMJpegServer(MJPEG_SERVER_PORT);
  });

  after(function () {
    if (mJpegServer) {
      mJpegServer.close();
    }
    if (stream) {
      stream.stop(); // ensure streams are always stopped
    }
  });

  it('should update mjpeg stream based on new data from mjpeg server', async function () {
    stream = new MJpegStream(MJPEG_SERVER_URL, _.noop);
    should.not.exist(stream.lastChunk);
    await stream.start();
    should.exist(stream.lastChunk);
    stream.updateCount.should.eql(1);

    await B.delay(1000); // let the stream update a bit
    stream.updateCount.should.be.above(1);

    // verify jpeg type and byte length of fixture image
    const startBytes = Buffer.from([0xff, 0xd8]);
    const endBytes = Buffer.from([0xff, 0xd9]);
    const startPos = stream.lastChunk.indexOf(startBytes);
    const endPos = stream.lastChunk.indexOf(endBytes);
    startPos.should.eql(0); // proves we have a jpeg
    endPos.should.eql(1278); // proves we have a jpeg of the right size

    // verify we can get the base64 version too
    const b64 = stream.lastChunkBase64;
    b64.should.eql(TEST_IMG_JPG);

    // verify we can get the PNG version too
    const png = await stream.lastChunkPNGBase64();
    png.should.be.a('string');
    png.indexOf('iVBOR').should.eql(0);
    png.length.should.be.above(400);


    // now stop the stream and wait some more then assert no new data has come in
    stream.stop();
    await B.delay(1000);
    should.not.exist(stream.lastChunk);
    stream.updateCount.should.eql(0);
  });

  it('should error out if the server does not send any images before a timeout', async function () {
    stream = new MJpegStream(MJPEG_SERVER_URL, _.noop);
    await stream.start(0).should.eventually.be.rejectedWith(/never sent/);
  });

});
