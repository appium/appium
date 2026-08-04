import assert from 'node:assert/strict';
import path from 'node:path';
import {before, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import type {ActionSequence, Constraints} from '@appium/types';
import {BaseDriver} from 'appium/driver.js';
import {fs, node, util} from 'appium/support.js';

import {GET_SIMILARITY_MODE, IMAGE_STRATEGY, MATCH_FEATURES_MODE, MATCH_TEMPLATE_MODE} from '../../lib/constants.js';
import {ImageElementPlugin} from '../../lib/plugin.js';

const THIS_PLUGIN_DIR = node.getModuleRootSync('@appium/images-plugin', fileURLToPath(import.meta.url))!;
const FIXTURES_DIR = path.join(THIS_PLUGIN_DIR, 'test', 'fixtures');
const TEST_IMG_1_PATH = path.join(FIXTURES_DIR, 'img1.png');
const TEST_IMG_2_PATH = path.join(FIXTURES_DIR, 'img2.png');
const TEST_IMG_2_PART_PATH = path.join(FIXTURES_DIR, 'img2_part.png');

describe('ImageElementPlugin#handle', function () {
  const next = async () => {};
  const driver = new BaseDriver<Constraints>({} as any);
  const p = new ImageElementPlugin('test');
  let testImg1B64: string;
  let testImg2B64: string;
  let testImg2PartB64: string;

  before(async function () {
    [testImg1B64, testImg2B64, testImg2PartB64] = await Promise.all([
      fs.readFile(TEST_IMG_1_PATH, 'base64'),
      fs.readFile(TEST_IMG_2_PATH, 'base64'),
      fs.readFile(TEST_IMG_2_PART_PATH, 'base64'),
    ]);
  });

  describe('compareImages', {timeout: 6000}, function () {
    it('should compare images via match features mode', async function () {
      const res = await p.compareImages(next, driver as any, MATCH_FEATURES_MODE, testImg1B64, testImg2B64, {});
      assert.ok(Object.hasOwn(res as any, 'count'));
      assert.strictEqual((res as any).count, 0);
    });
    it('should compare images via get similarity mode', async function () {
      const res = await p.compareImages(
        next,
        driver as any,
        GET_SIMILARITY_MODE,
        Buffer.from(testImg1B64, 'base64'),
        Buffer.from(testImg2B64, 'base64'),
        {},
      );
      assert.ok(Object.hasOwn(res as any, 'score'));
      assert.ok((res as any).score > 0.2);
    });
    it('should compare images via match template mode', async function () {
      const res = await p.compareImages(next, driver as any, MATCH_TEMPLATE_MODE, testImg1B64, testImg2B64, {});
      assert.ok(Object.hasOwn(res as any, 'rect'));
      assert.ok((res as any).rect.height > 0);
      assert.ok((res as any).rect.width > 0);
      assert.ok((res as any).score > 0.2);
    });
    it('should throw an error if comparison mode is not supported', async function () {
      await assert.rejects(
        p.compareImages(next, driver as any, 'some mode', '', ''),
        /comparison mode is unknown/,
      );
    });
    it('should throw an error if image template is broken', async function () {
      await assert.rejects(
        p.compareImages(
          next,
          driver as any,
          MATCH_TEMPLATE_MODE,
          Buffer.from('d1423423424'),
          Buffer.from('d1423423424'),
        ),
      );
    });
    it('should throw an error if image template is empty', async function () {
      await assert.rejects(
        p.compareImages(next, driver as any, MATCH_TEMPLATE_MODE, Buffer.from(''), Buffer.from('')),
      );
    });
  });

  describe('findElement(s)', function () {
    (driver as any).settings = {getSettings: () => ({})};
    (driver as any).isW3CProtocol = () => true;
    (driver as any).getScreenshot = () => testImg2B64;
    (driver as any).getWindowRect = () => ({x: 0, y: 0, width: 64, height: 64});
    it('should defer execution to regular command if not a find command', async function () {
      const next = async () => true;
      assert.strictEqual(await p.handle(next, driver as any, 'sendKeys'), true);
    });
    it('should defer execution to regular command if it is a find command but a different strategy', async function () {
      const next = async () => true;
      assert.strictEqual(await p.findElement(next, driver as any, 'xpath', '//foo/bar'), true);
      assert.strictEqual(await p.findElements(next, driver as any, 'xpath', '//foo/bar'), true);
    });
    it('should find an image element inside a screenshot', async function () {
      const el = await p.findElement(next, driver as any, IMAGE_STRATEGY, testImg2PartB64);
      assert.ok(util.unwrapElement(el).includes('appium-image-element'));
    });
    it('should find image elements inside a screenshot', async function () {
      const els = await p.findElements(next, driver as any, IMAGE_STRATEGY, testImg2PartB64);
      assert.strictEqual(els.length, 1);
      assert.ok(util.unwrapElement(els[0]).includes('appium-image-element'));
    });
  });

  describe('Element interactions', function () {
    let elId: string;
    before(async function () {
      (driver as any).settings = {getSettings: () => ({})};
      (driver as any).isW3CProtocol = () => true;
      (driver as any).getScreenshot = () => testImg2B64;
      (driver as any).getWindowRect = () => ({x: 0, y: 0, width: 64, height: 64});
      const el = await p.findElement(next, driver as any, IMAGE_STRATEGY, testImg2PartB64);
      elId = util.unwrapElement(el);
    });
    it('should click on the screen coords of the middle of the element', async function () {
      let action: ActionSequence[] | null = null;
      (driver as any).performActions = async (a: ActionSequence[]) => {
        action = a;
      };
      await p.handle(next, driver as any, 'click', elId);
      assert.deepStrictEqual(action, [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          actions: [
            {type: 'pointerMove', x: 24, y: 40, duration: 0},
            {type: 'pointerDown', button: 0},
            {type: 'pause', duration: 125},
            {type: 'pointerUp', button: 0},
          ],
        },
      ]);
    });
    it('should always say the element is displayed', async function () {
      assert.strictEqual(await p.handle(next, driver as any, 'elementDisplayed', elId), true);
    });
    it('should return the matched region size', async function () {
      assert.deepStrictEqual(await p.handle(next, driver as any, 'getSize', elId), {
        width: 48,
        height: 48,
      });
    });
    it('should return the matched region location', async function () {
      assert.deepStrictEqual(await p.handle(next, driver as any, 'getLocation', elId), {
        x: 0,
        y: 16,
      });
    });
    it('should return the region rect', async function () {
      assert.deepStrictEqual(await p.handle(next, driver as any, 'getElementRect', elId), {
        x: 0,
        y: 16,
        height: 48,
        width: 48,
      });
    });
    it('should return the match score as the score attr', async function () {
      assert.ok((await p.handle(next, driver as any, 'getAttribute', 'score', elId)) > 0.7);
    });
    it('should return the match visualization as the visual attr', async function () {
      (driver as any).settings = {
        getSettings: () => ({
          getMatchedImageResult: true,
        }),
      };
      const el = await p.findElement(next, driver as any, IMAGE_STRATEGY, testImg2PartB64);
      elId = util.unwrapElement(el);
      const visual = await p.handle(next, driver as any, 'getAttribute', 'visual', elId);
      assert.ok((visual as string).includes('iVBOR'));
    });
    it('should not allow any other attrs', async function () {
      await assert.rejects(p.handle(next, driver as any, 'getAttribute', 'rando', elId), /not yet/i);
    });
  });

  describe('performActions', function () {
    let imageEl: any;
    let nativeEl: any;
    before(async function () {
      imageEl = await p.findElement(next, driver as any, IMAGE_STRATEGY, testImg2PartB64);
      nativeEl = util.wrapElement('dummy-native-element-id');
    });
    it('should replace with coords of the image elements in pointerMove, scroll actions', async function () {
      const actionSequences: ActionSequence[] = [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          actions: [
            {type: 'pointerMove', x: 0, y: 0, duration: 0, origin: imageEl},
            {type: 'pointerMove', x: 15, y: 25, duration: 0, origin: imageEl},
          ],
        },
        {
          type: 'wheel',
          id: 'wheel',
          actions: [{type: 'scroll', x: 1, y: 0, deltaX: 1, deltaY: 2, origin: imageEl}],
        },
      ];
      await p.performActions(next, driver as any, actionSequences);
      assert.deepStrictEqual(actionSequences, [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          actions: [
            {type: 'pointerMove', x: 24, y: 40, duration: 0},
            {type: 'pointerMove', x: 39, y: 65, duration: 0},
          ],
        },
        {
          type: 'wheel',
          id: 'wheel',
          actions: [{type: 'scroll', x: 25, y: 40, deltaX: 1, deltaY: 2}],
        },
      ]);
    });
    it('should treat omitted x and y as zero when origin is an image element', async function () {
      const actionSequences: ActionSequence[] = [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          // The type requires x/y, but the incoming payload is not validated.
          actions: [{type: 'pointerMove', duration: 0, origin: imageEl} as any],
        },
      ];
      await p.performActions(next, driver as any, actionSequences);
      assert.deepStrictEqual(actionSequences, [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          actions: [{type: 'pointerMove', x: 24, y: 40, duration: 0}],
        },
      ]);
    });
    it('should not be modified except pointerMove and scroll actions includes image element as origin', async function () {
      const actionSequences: ActionSequence[] = [
        {
          type: 'pointer',
          id: 'mouse',
          parameters: {pointerType: 'touch'},
          actions: [
            {type: 'pointerMove', x: 1, y: 1, duration: 0},
            {type: 'pointerMove', x: 2, y: 2, duration: 10, origin: nativeEl},
            {type: 'pointerMove', x: 3, y: 3, duration: 20, origin: 'viewport'},
            {type: 'pointerMove', x: 4, y: 4, duration: 30, origin: 'pointer'},
            {type: 'pointerDown', button: 0},
            {type: 'pause', duration: 125},
            {type: 'pointerUp', button: 0},
          ],
        },
        {
          type: 'wheel',
          id: 'wheel',
          actions: [
            {type: 'scroll', x: 1, y: 1, deltaX: 1, deltaY: 2},
            {type: 'scroll', x: 2, y: 2, deltaX: 2, deltaY: 3, origin: nativeEl},
            {type: 'scroll', x: 3, y: 3, deltaX: 3, deltaY: 4, origin: 'viewport'},
            {type: 'scroll', x: 4, y: 4, deltaX: 4, deltaY: 5, origin: 'pointer'},
          ],
        },
        {
          type: 'key',
          id: 'key',
          actions: [
            {type: 'keyDown', value: 'a'},
            {type: 'keyUp', value: 'a'},
          ],
        },
      ];
      const clone = structuredClone(actionSequences);
      await p.performActions(next, driver as any, actionSequences);
      assert.deepStrictEqual(actionSequences, clone);
    });
  });
});
