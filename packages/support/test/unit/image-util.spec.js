/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable require-await */
import {createSandbox} from 'sinon';
import rewiremock from 'rewiremock/node';

const {expect} = chai;

const PHONY_BUFFER = Buffer.from('cheeseburgers');

/** @type {import('@jimp/core/types').Bitmap} */
const PHONY_BITMAP = {
  data: PHONY_BUFFER,
  width: 100,
  height: 100,
};

describe('AppiumImage', function () {
  /** @type {import('sinon').SinonSandbox} */
  let sandbox;

  /** @type {typeof import('../../lib/image-util').AppiumImage} */
  let AppiumImage;

  let mockJimp;

  beforeEach(function () {
    sandbox = createSandbox();
    mockJimp = {
      getBufferAsync: sandbox.stub().resolves(PHONY_BUFFER),
      writeAsync: sandbox.stub().resolves(),
      resize: sandbox.stub().returnsThis(),
      scaleToFit: sandbox.stub().returnsThis(),
    };

    const jimpStub = sandbox.stub().callsFake((buf, cb) => {
      mockJimp.bitmap = PHONY_BITMAP;
      setImmediate(() => cb(null, mockJimp));
      return mockJimp;
    });
    jimpStub.MIME_JPEG = 'image/jpeg';
    jimpStub.MIME_PNG = 'image/png';
    jimpStub.MIME_BMP = 'image/bmp';

    ({AppiumImage} = rewiremock.proxy(() => require('../../lib/image-util'), {
      jimp: jimpStub,
    }));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should instantiate an AppiumImage', function () {
      expect(new AppiumImage(mockJimp)).to.be.an.instanceof(AppiumImage);
    });
  });

  describe('static method', function () {
    describe('from()', function () {});
    describe('fromString()', function () {});
    describe('fromBuffer()', function () {});
  });

  describe('instance method', function () {
    /** @type {AppiumImage} */
    let img;

    beforeEach(async function () {
      img = await AppiumImage.fromBuffer(PHONY_BUFFER);
    });

    describe('getBuffer()', function () {
      it('should resolve to a Buffer', async function () {
        await expect(img.getBuffer('image/jpeg')).to.eventually.equal(PHONY_BUFFER);
      });

      it('should call thru to Jimp', function () {
        img.getBuffer('image/jpeg');
        expect(mockJimp.getBufferAsync).to.have.been.calledOnce;
      });
    });

    describe('resize()', function () {
      it('should return an AppiumImage', function () {
        expect(img.resize(100, 100)).to.equal(img);
      });

      it('should call thru to Jimp', function () {
        img.resize(100, 100);
        expect(mockJimp.resize).to.have.been.calledWith(100, 100);
      });
    });

    describe('scaleToFit()', function () {
      it('should return an AppiumImage', function () {
        expect(img.scaleToFit(100, 100)).to.equal(img);
      });

      it('should call thru to Jimp', function () {
        img.scaleToFit(100, 100);
        expect(mockJimp.scaleToFit).to.have.been.calledWith(100, 100);
      });
    });

    describe('write()', function () {
      it('should resolve with an AppiumImage', async function () {
        mockJimp.write = sandbox.stub().resolves(img);
        await expect(img.write('/some/path')).to.eventually.be.an.instanceof(AppiumImage);
      });
    });
  });

  describe('property', function () {
    /** @type {AppiumImage} */
    let img;

    beforeEach(async function () {
      img = await AppiumImage.fromBuffer(PHONY_BUFFER);
    });

    describe('bitmap', function () {
      it('should return the value of the `bitmap` property of the internal Jimp image', function () {
        expect(img.bitmap).to.exist;
        expect(img.bitmap).to.equal(mockJimp.bitmap);
      });
    });
  });
});

/**
 * @typedef {import('../../lib/image-util').AppiumImage} AppiumImage
 */
