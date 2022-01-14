// transpile:mocha

import { NodeBinaryCheck, NodeVersionCheck,
         OptionalFfmpegCommandCheck, OptionalMjpegConsumerCommandCheck } from '../lib/general';
import * as tp from 'teen_process';
import * as utils from '../lib/utils';
import NodeDetector from '../lib/node-detector';
import { withMocks } from '@appium/test-support';
import B from 'bluebird';
import { removeColors } from './helper';


describe('general', function () {
  describe('NodeBinaryCheck', withMocks({NodeDetector}, (mocks) => {
    let check = new NodeBinaryCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'The Node.js binary was found at: /a/b/c/d'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve(null));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'The Node.js binary was NOT found!'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Manually setup Node.js.');
    });
  }));

  describe('NodeVersionCheck', withMocks({NodeDetector, tp}, (mocks) => {
    let check = new NodeVersionCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(B.resolve({stdout: 'v10.0.0', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Node version is 10.0.0'
      });
      mocks.verify();
    });
    it('diagnose - failure - insufficient version', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(B.resolve({stdout: 'v0.12.18', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Node version should be at least 10.0.0!'
      });
      mocks.verify();
    });
    it('diagnose - failure - bad output', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(B.resolve({stdout: 'blahblahblah', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: `Unable to find node version (version = 'blahblahblah')`
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Manually upgrade Node.js.');
    });
  }));

  describe('OptionalFfmpegCommandCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalFfmpegCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.tp.expects('exec').once().returns({stdout: `ffmpeg version 4.1 Copyright (c) 2000-2018 the FFmpeg developers
      built with Apple LLVM version 10.0.0 (clang-1000.11.45.5)
      configuration: --prefix=/usr/local/Cellar/ffmpeg/4.1_1 --enable-shared --enable-pthreads --enable-version3 --enable-hardcoded-tables --enable-avresample --cc=clang --host-cflags= --host-ldflags= --enable-ffplay --enable-gpl --enable-libmp3lame --enable-libopus --enable-libsnappy --enable-libtheora --enable-libvorbis --enable-libvpx --enable-libx264 --enable-libx265 --enable-libxvid --enable-lzma --enable-opencl --enable-videotoolbox
      libavutil      56. 22.100 / 56. 22.100
      libpostproc    55.  3.100 / 55.  3.100`, stderr: ''});
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/ffmpeg');
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'ffmpeg is installed at: path/to/ffmpeg. ffmpeg version 4.1 Copyright (c) 2000-2018 the FFmpeg developers'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'ffmpeg cannot be found'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('ffmpeg is needed to record screen features. Please read https://www.ffmpeg.org/ to install it');
    });
  }));

  describe('OptionalMjpegConsumerCommandCheck', withMocks({tp}, (mocks) => {
    let check = new OptionalMjpegConsumerCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.tp.expects('exec').once().returns({stdout: `
        {
          "dependencies": {
            "mjpeg-consumer": {
              "version": "1.1.0",
              "from": "mjpeg-consumer",
              "resolved": "https://registry.npmjs.org/mjpeg-consumer/-/mjpeg-consumer-1.1.0.tgz"
            }
          },
          "path": "/path/to/node/node/v11.4.0/lib"
        }
      `, stderr: ''});
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'mjpeg-consumer is installed at: /path/to/node/node/v11.4.0/lib. Installed version is: 1.1.0'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.tp.expects('exec').once().returns({stdout: '{}', stderr: ''});
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'mjpeg-consumer cannot be found.'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.
        equal("mjpeg-consumer module is required to use MJPEG-over-HTTP features. Please install it with 'npm i -g mjpeg-consumer'.");
    });
  }));
});
