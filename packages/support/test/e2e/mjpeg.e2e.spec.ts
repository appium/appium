import _ from 'lodash';
import {sleep} from 'asyncbox';
import http from 'node:http';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import mJpegServer from 'mjpeg-server';
import getPort from 'get-port';
import {mjpeg} from '../../lib';

const {MJpegStream} = mjpeg;

const TEST_IMG_JPG =
  '/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAeAAD/4QOBaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzE0MCA3OS4xNjA0NTEsIDIwMTcvMDUvMDYtMDE6MDg6MjEgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6NGY5ODc1OTctZGE2My00Y2M0LTkzNDMtNGYyNjgzMGUwNjk3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjlDMzI3QkY0N0Q3NTExRThCMTlDOTVDMDc2RDE5MDY5IiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjlDMzI3QkYzN0Q3NTExRThCMTlDOTVDMDc2RDE5MDY5IiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NGY5ODc1OTctZGE2My00Y2M0LTkzNDMtNGYyNjgzMGUwNjk3IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjRmOTg3NTk3LWRhNjMtNGNjNC05MzQzLTRmMjY4MzBlMDY5NyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pv/uAA5BZG9iZQBkwAAAAAH/2wCEABALCwsMCxAMDBAXDw0PFxsUEBAUGx8XFxcXFx8eFxoaGhoXHh4jJSclIx4vLzMzLy9AQEBAQEBAQEBAQEBAQEABEQ8PERMRFRISFRQRFBEUGhQWFhQaJhoaHBoaJjAjHh4eHiMwKy4nJycuKzU1MDA1NUBAP0BAQEBAQEBAQEBAQP/AABEIACAAIAMBIgACEQEDEQH/xABgAAEAAwEAAAAAAAAAAAAAAAAABAUHCAEBAAAAAAAAAAAAAAAAAAAAABAAAQMCAgsAAAAAAAAAAAAAAAECBBEDEgYhMRODo7PTVAUWNhEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8Az8AAdAAAAAAI8+fE8dEuTZtzZR7VMb6OdTE5GJoYirrUp/e8qd9wb3TGe/lJ2551sx8D/9k=';

const MJPEG_HOST = '127.0.0.1';

/**
 * Start an MJPEG server for testing; it sends the same image repeatedly. Caller must close the server.
 * @param port - Port the server should listen on.
 * @param intMs - How often the server should push an image (default 300).
 * @param times - How many times to push an image before closing the connection (default 20).
 */
function initMJpegServer(port: number, intMs = 300, times = 20): http.Server {
  const server = http
    .createServer(async function (req, res) {
      const mJpegReqHandler = mJpegServer.createReqHandler(req, res);
      const jpg = Buffer.from(TEST_IMG_JPG, 'base64');

      // Just send the same jpeg over and over.
      for (let i = 0; i < times; i++) {
        await sleep(intMs);
        mJpegReqHandler._write(jpg, null, _.noop);
      }
      mJpegReqHandler.close();
    })
    .listen(port);

  return server;
}

describe('MJpeg Stream (e2e)', function () {
  let mJpegServer: http.Server | null = null;
  let stream: InstanceType<typeof MJpegStream>;
  let serverUrl: string;
  let port: number;

  before(async function () {
    use(chaiAsPromised);

    port = await getPort();
    serverUrl = `http://${MJPEG_HOST}:${port}`;
    mJpegServer = initMJpegServer(port);
  });

  after(function () {
    if (mJpegServer) {
      mJpegServer.close();
    }
    if (stream) {
      stream.stop();
    }
  });

  it('should update mjpeg stream based on new data from mjpeg server', async function () {
    stream = new MJpegStream(serverUrl, _.noop);
    /* eslint-disable dot-notation -- access private lastChunk/updateCount for assertion */
    expect(stream['lastChunk']).to.not.exist;
    await stream.start();
    expect(stream['lastChunk']).to.exist;
    expect(stream['updateCount']).to.eql(1);

    await sleep(1000);
    expect(stream['updateCount']).to.be.above(1);

    const startBytes = Buffer.from([0xff, 0xd8]);
    const endBytes = Buffer.from([0xff, 0xd9]);
    const startPos = stream['lastChunk']!.indexOf(startBytes);
    const endPos = stream['lastChunk']!.indexOf(endBytes);
    expect(startPos).to.eql(0);
    expect(endPos).to.eql(1278);

    const b64 = stream.lastChunkBase64;
    expect(b64).to.eql(TEST_IMG_JPG);

    const png = await stream.lastChunkPNGBase64();
    expect(png).to.be.a('string');
    expect(png!.indexOf('iVBOR')).to.eql(0);

    stream.stop();
    await sleep(1000);
    expect(stream['lastChunk']).to.not.exist;
    expect(stream['updateCount']).to.eql(0);
    /* eslint-enable dot-notation */
  });

  it('should error out if the server cannot be connected', async function () {
    stream = new MJpegStream('http://localhost', _.noop);
    await expect(stream.start()).to.eventually.be.rejected;
  });
});
