import assert from 'node:assert/strict';
import {afterEach, before, beforeEach, describe, it} from 'node:test';

import type {Constraints} from '@appium/types';
import {BaseDriver} from 'appium/driver.js';
import {util} from 'appium/support.js';
import {createSandbox, type SinonSandbox} from 'sinon';

import {IMAGE_ELEMENT_PREFIX} from '../../lib/constants.js';
import {ImageElementFinder} from '../../lib/finder.js';
import {ImageElement} from '../../lib/image-element.js';
import {getImgElFromArgs} from '../../lib/plugin.js';

const defRect = {x: 100, y: 110, width: 50, height: 25};
const defTemplate = Buffer.from('iVBORasdf', 'base64');

describe('ImageElement', function () {
  const driver = new BaseDriver<Constraints>({} as any);

  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('.size', function () {
    it('should return the width and height of the image el', function () {
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      assert.deepStrictEqual(el.size, {width: defRect.width, height: defRect.height});
    });
  });

  describe('.location', function () {
    it('should return the location of the image el', function () {
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      assert.deepStrictEqual(el.location, {x: defRect.x, y: defRect.y});
    });
  });

  describe('.center', function () {
    it('should return the center location of the image el', function () {
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      assert.deepStrictEqual(el.center, {
        x: defRect.x + defRect.width / 2,
        y: defRect.y + defRect.height / 2,
      });
    });
  });

  describe('.asElement', function () {
    it('should get the webdriver object representation of the element', function () {
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      assert.match(util.unwrapElement(el.asElement()), /^appium-image-el/);
    });
  });

  describe('.equals', function () {
    it('should say two image elements with same rect are equal', function () {
      const el1 = new ImageElement({
        template: Buffer.from('foo'),
        rect: defRect,
        score: 1.0,
      });
      const el2 = new ImageElement({
        template: Buffer.from('bar'),
        rect: defRect,
        score: 1.0,
      });
      assert.strictEqual(el1.equals(el2), true);
      assert.strictEqual(el2.equals(el1), true);
    });
    it('should say two image elements with different rect are not equal', function () {
      const el1 = new ImageElement({
        template: defTemplate,
        rect: {...defRect, x: 0},
        score: 1.0,
      });
      const el2 = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      assert.strictEqual(el1.equals(el2), false);
      assert.strictEqual(el2.equals(el1), false);
    });
  });

  describe('.click', function () {
    it('should reject an invalid tap strategy', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      await d.settings.update({imageElementTapStrategy: 'bad'});
      await assert.rejects(el.click(d as any), /Incorrect imageElementTapStrategy/);
    });
    it('should try to check for image element staleness, and throw if stale', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      const f = new ImageElementFinder();
      sandbox.stub(f, 'findByImage').throws();
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
        finder: f,
      });
      // we need to check for staleness if explicitly requested to do so
      await d.settings.update({
        checkForImageElementStaleness: true,
        autoUpdateImageElementPosition: false,
      });
      await assert.rejects(el.click(d as any), /no longer attached/);

      // and also if we are updating the element position
      await d.settings.update({
        checkForImageElementStaleness: false,
        autoUpdateImageElementPosition: true,
      });
      await assert.rejects(el.click(d as any), /no longer attached/);
    });
    it('should auto-update element position if requested', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performActions = () => {};
      sandbox.stub(d as any, 'performActions');
      const f = new ImageElementFinder();
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
        finder: f,
      });
      const newRect = {...defRect, x: defRect.x + 10, y: defRect.y + 5};
      const elPos2 = new ImageElement({
        template: defTemplate,
        rect: newRect,
        score: 1.0,
        finder: f,
      });
      sandbox.stub(f, 'findByImage').returns(elPos2 as any);
      await d.settings.update({
        autoUpdateImageElementPosition: true,
      });
      assert.notDeepStrictEqual(el.rect, newRect);
      await el.click(d as any);
      assert.deepStrictEqual(el.rect, newRect);
    });
    it('should tap the center of an element using w3c actions by default', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performActions = () => {};
      const actionStub = sandbox.stub(d as any, 'performActions');
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
      });
      await el.click(d as any);
      const pointerMoveAction = actionStub.args[0][0][0].actions[0];
      assert.strictEqual(pointerMoveAction.x, el.center.x);
      assert.strictEqual(pointerMoveAction.y, el.center.y);
    });
    it('should fall back to touchactions if w3c actions do not exist on driver', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performTouch = () => {};
      const actionStub = sandbox.stub(d as any, 'performTouch');
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
      });
      await el.click(d as any);
      const action = actionStub.args[0][0][0].options;
      assert.strictEqual(action.x, el.center.x);
      assert.strictEqual(action.y, el.center.y);
    });
    it('should use touchactions if requested', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performActions = () => {};
      const w3cStub = sandbox.stub(d as any, 'performActions');
      (d as any).performTouch = () => {};
      const touchStub = sandbox.stub(d as any, 'performTouch');
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
        imageElementTapStrategy: 'touchActions',
      });
      await el.click(d as any);
      const action = touchStub.args[0][0][0].options;
      assert.strictEqual(action.x, el.center.x);
      assert.strictEqual(action.y, el.center.y);
      assert.deepStrictEqual(w3cStub.callCount, 0);
    });
    it('should throw if driver does not implement any type of action', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
      });
      await assert.rejects(el.click(d as any), /did not implement/);
    });
  });

  describe('#execute', function () {
    // aGFwcHkgdGVzdGluZw== is 'happy testing'
    const f = new ImageElementFinder();
    const imgEl = new ImageElement({
      template: defTemplate,
      rect: defRect,
      score: 0,
      match: Buffer.from('aGFwcHkgdGVzdGluZw==', 'base64'),
      finder: f,
    });
    let clickStub: sinon.SinonStub;

    before(function () {
      clickStub = sandbox.stub(imgEl, 'click');
      f.registerImageElement(imgEl);
      clickStub.returns(true);
    });

    it('should reject executions for unsupported commands', async function () {
      await assert.rejects(ImageElement.execute(driver as any, imgEl, 'foobar'), /not yet been implemented/);
    });
    it('should get displayed status of element', async function () {
      assert.strictEqual(await ImageElement.execute(driver as any, imgEl, 'elementDisplayed'), true);
    });
    it('should get size of element', async function () {
      assert.deepStrictEqual(await ImageElement.execute(driver as any, imgEl, 'getSize'), {
        width: defRect.width,
        height: defRect.height,
      });
    });
    it('should get location of element', async function () {
      assert.deepStrictEqual(await ImageElement.execute(driver as any, imgEl, 'getLocation'), {
        x: defRect.x,
        y: defRect.y,
      });
    });
    it('should get location in view of element', async function () {
      assert.deepStrictEqual(await ImageElement.execute(driver as any, imgEl, 'getLocation'), {
        x: defRect.x,
        y: defRect.y,
      });
    });
    it('should get rect of element', async function () {
      assert.deepStrictEqual(await ImageElement.execute(driver as any, imgEl, 'getElementRect'), defRect);
    });
    it('should get score of element', async function () {
      assert.deepStrictEqual(await ImageElement.execute(driver as any, imgEl, 'getAttribute', 'score'), 0);
    });
    it('should get visual of element', async function () {
      assert.deepStrictEqual(
        await ImageElement.execute(driver as any, imgEl, 'getAttribute', 'visual'),
        'aGFwcHkgdGVzdGluZw==',
      );
    });
    it('should get null as visual of element by default', async function () {
      const imgElement = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      assert.deepStrictEqual(await ImageElement.execute(driver as any, imgElement, 'getAttribute', 'visual'), null);
    });
    it('should not get other attribute', async function () {
      await assert.rejects(
        ImageElement.execute(driver as any, imgEl, 'getAttribute', 'content-desc'),
        /Method has not yet been implemented/,
      );
    });
    it('should click element', async function () {
      assert.strictEqual(await ImageElement.execute(driver as any, imgEl, 'click'), true);
    });
  });
});

describe('image element LRU cache', function () {
  it('should accept and cache image elements', function () {
    const el1 = new ImageElement({
      template: defTemplate,
      rect: defRect,
      score: 1.0,
    });
    const el2 = new ImageElement({
      template: defTemplate,
      rect: defRect,
      score: 1.0,
    });
    const finder = new ImageElementFinder();
    finder.registerImageElement(el1);
    assert.strictEqual(el1.equals(finder.getImageElement(el1.id)!), true);
    assert.strictEqual(finder.getImageElement(el2.id), undefined);
  });
  it('once cache reaches max size, should eject image elements', function () {
    const el1 = new ImageElement({
      template: defTemplate,
      rect: defRect,
      score: 1.0,
    });
    const el2 = new ImageElement({
      template: defTemplate,
      rect: defRect,
      score: 1.0,
    });
    const finder = new ImageElementFinder(1);
    finder.registerImageElement(el1);
    assert.notStrictEqual(finder.getImageElement(el1.id), undefined);
    finder.registerImageElement(el2);
    assert.strictEqual(finder.getImageElement(el1.id), undefined);
    assert.notStrictEqual(finder.getImageElement(el2.id), undefined);
  });
});

describe('getImgElFromArgs', function () {
  it('should return the image element id from json obj in args', function () {
    const imgEl = `${IMAGE_ELEMENT_PREFIX}foo`;
    const args = [1, 'foo', imgEl];
    assert.deepStrictEqual(getImgElFromArgs(args), imgEl);
  });
  it('should not return anything if image element id not in args', function () {
    const args = [1, 'foo'];
    assert.strictEqual(getImgElFromArgs(args), undefined);
  });
  it('should not find image element id in anything but prefix', function () {
    const notImgEl = `foo${IMAGE_ELEMENT_PREFIX}`;
    const args = [1, 'foo', notImgEl];
    assert.strictEqual(getImgElFromArgs(args), undefined);
  });
});
