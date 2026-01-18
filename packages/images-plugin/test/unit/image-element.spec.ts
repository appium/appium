import _ from 'lodash';
import {BaseDriver} from 'appium/driver';
import {util} from 'appium/support';
import {ImageElementFinder} from '../../lib/finder';
import {getImgElFromArgs} from '../../lib/plugin';
import {ImageElement} from '../../lib/image-element';
import {createSandbox, type SinonSandbox} from 'sinon';
import {IMAGE_ELEMENT_PREFIX} from '../../lib/constants';
import type {Constraints} from '@appium/types';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

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
      expect(el.size).to.eql({width: defRect.width, height: defRect.height});
    });
  });

  describe('.location', function () {
    it('should return the location of the image el', function () {
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      expect(el.location).to.eql({x: defRect.x, y: defRect.y});
    });
  });

  describe('.center', function () {
    it('should return the center location of the image el', function () {
      const el = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      expect(el.center).to.eql({
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
      expect(util.unwrapElement(el.asElement())).to.match(/^appium-image-el/);
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
      expect(el1.equals(el2)).to.be.true;
      expect(el2.equals(el1)).to.be.true;
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
      expect(el1.equals(el2)).to.be.false;
      expect(el2.equals(el1)).to.be.false;
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
      await expect(el.click(d as any)).to.be.rejectedWith(/Incorrect imageElementTapStrategy/);
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
      await expect(el.click(d as any)).to.be.rejectedWith(/no longer attached/);

      // and also if we are updating the element position
      await d.settings.update({
        checkForImageElementStaleness: false,
        autoUpdateImageElementPosition: true,
      });
      await expect(el.click(d as any)).to.be.rejectedWith(/no longer attached/);
    });
    it('should auto-update element position if requested', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performActions = _.noop;
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
      expect(el.rect).to.not.eql(newRect);
      await el.click(d as any);
      expect(el.rect).to.eql(newRect);
    });
    it('should tap the center of an element using w3c actions by default', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performActions = _.noop;
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
      expect(pointerMoveAction.x).to.equal(el.center.x);
      expect(pointerMoveAction.y).to.equal(el.center.y);
    });
    it('should fall back to touchactions if w3c actions do not exist on driver', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performTouch = _.noop;
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
      expect(action.x).to.equal(el.center.x);
      expect(action.y).to.equal(el.center.y);
    });
    it('should use touchactions if requested', async function () {
      const d = new BaseDriver<Constraints>({} as any);
      (d as any).performActions = _.noop;
      const w3cStub = sandbox.stub(d as any, 'performActions');
      (d as any).performTouch = _.noop;
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
      expect(action.x).to.equal(el.center.x);
      expect(action.y).to.equal(el.center.y);
      expect(w3cStub.callCount).to.eql(0);
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
      await expect(el.click(d as any)).to.be.rejectedWith(/did not implement/);
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
      await expect(ImageElement.execute(driver as any, imgEl, 'foobar')).to.be.rejectedWith(
        /not yet been implemented/
      );
    });
    it('should get displayed status of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'elementDisplayed')).to.eventually.be.true;
    });
    it('should get size of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'getSize')).to.eventually.eql({
        width: defRect.width,
        height: defRect.height,
      });
    });
    it('should get location of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'getLocation')).to.eventually.eql({
        x: defRect.x,
        y: defRect.y,
      });
    });
    it('should get location in view of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'getLocation')).to.eventually.eql({
        x: defRect.x,
        y: defRect.y,
      });
    });
    it('should get rect of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'getElementRect')).to.eventually.eql(defRect);
    });
    it('should get score of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'getAttribute', 'score')).to.eventually.eql(0);
    });
    it('should get visual of element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'getAttribute', 'visual')).to.eventually.eql(
        'aGFwcHkgdGVzdGluZw=='
      );
    });
    it('should get null as visual of element by default', async function () {
      const imgElement = new ImageElement({
        template: defTemplate,
        rect: defRect,
        score: 1.0,
      });
      await expect(
        ImageElement.execute(
          driver as any,
          imgElement,
          'getAttribute',
          'visual'
        )
      ).to.eventually.eql(null);
    });
    it('should not get other attribute', async function () {
      await expect(
        ImageElement.execute(
          driver as any,
          imgEl,
          'getAttribute',
          'content-desc'
        )
      ).to.eventually.rejectedWith('Method has not yet been implemented');
    });
    it('should click element', async function () {
      await expect(ImageElement.execute(driver as any, imgEl, 'click')).to.eventually.be.true;
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
    expect(el1.equals(finder.getImageElement(el1.id)!)).to.be.true;
    expect(_.isUndefined(finder.getImageElement(el2.id))).to.be.true;
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
    expect(_.isUndefined(finder.getImageElement(el1.id))).to.be.false;
    finder.registerImageElement(el2);
    expect(_.isUndefined(finder.getImageElement(el1.id))).to.be.true;
    expect(_.isUndefined(finder.getImageElement(el2.id))).to.be.false;
  });
});

describe('getImgElFromArgs', function () {
  it('should return the image element id from json obj in args', function () {
    const imgEl = `${IMAGE_ELEMENT_PREFIX}foo`;
    const args = [1, 'foo', imgEl];
    expect(getImgElFromArgs(args)).to.eql(imgEl);
  });
  it('should not return anything if image element id not in args', function () {
    const args = [1, 'foo'];
    expect(_.isUndefined(getImgElFromArgs(args))).to.be.true;
  });
  it('should not find image element id in anything but prefix', function () {
    const notImgEl = `foo${IMAGE_ELEMENT_PREFIX}`;
    const args = [1, 'foo', notImgEl];
    expect(_.isUndefined(getImgElFromArgs(args))).to.be.true;
  });
});
