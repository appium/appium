import _ from 'lodash';
import BaseDriver from 'appium/driver';
import {ImageElementFinder, W3C_ELEMENT_KEY} from '../../lib/finder';
import {getImgElFromArgs} from '../../lib/plugin';
import {ImageElement, IMAGE_ELEMENT_PREFIX} from '../../lib/image-element';
import sinon from 'sinon';

const defRect = {x: 100, y: 110, width: 50, height: 25};
const defTemplate = 'iVBORasdf';

describe('ImageElement', function () {
  const driver = new BaseDriver();

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('.size', function () {
    it('should return the width and height of the image el', function () {
      const el = new ImageElement(defTemplate, defRect);
      el.size.should.eql({width: defRect.width, height: defRect.height});
    });
  });

  describe('.location', function () {
    it('should return the location of the image el', function () {
      const el = new ImageElement(defTemplate, defRect);
      el.location.should.eql({x: defRect.x, y: defRect.y});
    });
  });

  describe('.center', function () {
    it('should return the center location of the image el', function () {
      const el = new ImageElement(defTemplate, defRect);
      el.center.should.eql({
        x: defRect.x + defRect.width / 2,
        y: defRect.y + defRect.height / 2,
      });
    });
  });

  describe('.asElement', function () {
    it('should get the webdriver object representation of the element', function () {
      const el = new ImageElement(defTemplate, defRect);
      el.asElement()[W3C_ELEMENT_KEY].should.match(/^appium-image-el/);
    });
  });

  describe('.equals', function () {
    it('should say two image elements with same rect are equal', function () {
      const el1 = new ImageElement('foo', defRect);
      const el2 = new ImageElement('bar', defRect);
      el1.equals(el2).should.be.true;
      el2.equals(el1).should.be.true;
    });
    it('should say two image elements with different rect are not equal', function () {
      const el1 = new ImageElement(defTemplate, {...defRect, x: 0});
      const el2 = new ImageElement(defTemplate, defRect);
      el1.equals(el2).should.be.false;
      el2.equals(el1).should.be.false;
    });
  });

  describe('.click', function () {
    it('should reject an invalid tap strategy', async function () {
      const d = new BaseDriver();
      const el = new ImageElement(defTemplate, defRect);
      await d.settings.update({imageElementTapStrategy: 'bad'});
      await el.click(d).should.be.rejectedWith(/Incorrect imageElementTapStrategy/);
    });
    it('should try to check for image element staleness, and throw if stale', async function () {
      const d = new BaseDriver();
      const f = new ImageElementFinder(d);
      sandbox.stub(f, 'findByImage').throws();
      const el = new ImageElement(defTemplate, defRect, null, null, f);
      // we need to check for staleness if explicitly requested to do so
      await d.settings.update({
        checkForImageElementStaleness: true,
        autoUpdateImageElementPosition: false,
      });
      await el.click(d).should.be.rejectedWith(/no longer attached/);

      // and also if we are updating the element position
      await d.settings.update({
        checkForImageElementStaleness: false,
        autoUpdateImageElementPosition: true,
      });
      await el.click(d).should.be.rejectedWith(/no longer attached/);
    });
    it('should auto-update element position if requested', async function () {
      const d = new BaseDriver();
      d.performActions = _.noop;
      sandbox.stub(d, 'performActions');
      const f = new ImageElementFinder(d);
      const el = new ImageElement(defTemplate, defRect, null, null, f);
      const newRect = {...defRect, x: defRect.x + 10, y: defRect.y + 5};
      const elPos2 = new ImageElement(defTemplate, newRect, null, null, f);
      sandbox.stub(f, 'findByImage').returns(elPos2);
      await d.settings.update({
        autoUpdateImageElementPosition: true,
      });
      el.rect.should.not.eql(newRect);
      await el.click(d);
      el.rect.should.eql(newRect);
    });
    it('should tap the center of an element using w3c actions by default', async function () {
      const d = new BaseDriver();
      d.performActions = _.noop;
      const actionStub = sandbox.stub(d, 'performActions');
      const el = new ImageElement(defTemplate, defRect);
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
      });
      await el.click(d);
      const pointerMoveAction = actionStub.args[0][0][0].actions[0];
      pointerMoveAction.x.should.equal(el.center.x);
      pointerMoveAction.y.should.equal(el.center.y);
    });
    it('should fall back to touchactions if w3c actions do not exist on driver', async function () {
      const d = new BaseDriver();
      d.performTouch = _.noop;
      const actionStub = sandbox.stub(d, 'performTouch');
      const el = new ImageElement(defTemplate, defRect);
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
      });
      await el.click(d);
      const action = actionStub.args[0][0][0].options;
      action.x.should.equal(el.center.x);
      action.y.should.equal(el.center.y);
    });
    it('should use touchactions if requested', async function () {
      const d = new BaseDriver();
      d.performActions = _.noop;
      const w3cStub = sandbox.stub(d, 'performActions');
      d.performTouch = _.noop;
      const touchStub = sandbox.stub(d, 'performTouch');
      const el = new ImageElement(defTemplate, defRect);
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
        imageElementTapStrategy: 'touchActions',
      });
      await el.click(d);
      const action = touchStub.args[0][0][0].options;
      action.x.should.equal(el.center.x);
      action.y.should.equal(el.center.y);
      w3cStub.callCount.should.eql(0);
    });
    it('should throw if driver does not implement any type of action', async function () {
      const d = new BaseDriver();
      const el = new ImageElement(defTemplate, defRect);
      // skip the staleness check for this test
      await d.settings.update({
        checkForImageElementStaleness: false,
      });
      await el.click(d).should.be.rejectedWith(/did not implement/);
    });
  });

  describe('#execute', function () {
    // aGFwcHkgdGVzdGluZw== is 'happy testing'
    const f = new ImageElementFinder(driver);
    const imgEl = new ImageElement(defTemplate, defRect, 0, 'aGFwcHkgdGVzdGluZw==', f);
    let clickStub;

    before(function () {
      clickStub = sandbox.stub(imgEl, 'click');
      f.imgElCache.set(imgEl.id, imgEl);
      clickStub.returns(true);
    });

    after(function () {
      f.imgElCache.clear();
    });

    it('should reject executions for unsupported commands', async function () {
      await ImageElement.execute(driver, imgEl, 'foobar').should.be.rejectedWith(
        /not yet been implemented/
      );
    });
    it('should get displayed status of element', async function () {
      await ImageElement.execute(driver, imgEl, 'elementDisplayed').should.eventually.be.true;
    });
    it('should get size of element', async function () {
      await ImageElement.execute(driver, imgEl, 'getSize').should.eventually.eql({
        width: defRect.width,
        height: defRect.height,
      });
    });
    it('should get location of element', async function () {
      await ImageElement.execute(driver, imgEl, 'getLocation').should.eventually.eql({
        x: defRect.x,
        y: defRect.y,
      });
    });
    it('should get location in view of element', async function () {
      await ImageElement.execute(driver, imgEl, 'getLocation').should.eventually.eql({
        x: defRect.x,
        y: defRect.y,
      });
    });
    it('should get rect of element', async function () {
      await ImageElement.execute(driver, imgEl, 'getElementRect').should.eventually.eql(defRect);
    });
    it('should get score of element', async function () {
      await ImageElement.execute(driver, imgEl, 'getAttribute', 'score').should.eventually.eql(0);
    });
    it('should get visual of element', async function () {
      await ImageElement.execute(driver, imgEl, 'getAttribute', 'visual').should.eventually.eql(
        'aGFwcHkgdGVzdGluZw=='
      );
    });
    it('should get null as visual of element by default', async function () {
      const imgElement = new ImageElement(defTemplate, defRect);
      await ImageElement.execute(
        driver,
        imgElement,
        'getAttribute',
        'visual'
      ).should.eventually.equal(null);
    });
    it('should not get other attribute', async function () {
      await ImageElement.execute(
        driver,
        imgEl,
        'getAttribute',
        'content-desc'
      ).should.be.rejectedWith('Method has not yet been implemented');
    });
    it('should click element', async function () {
      await ImageElement.execute(driver, imgEl, 'click').should.eventually.be.true;
    });
  });
});

describe('image element LRU cache', function () {
  it('should accept and cache image elements', function () {
    const el1 = new ImageElement(defTemplate, defRect);
    const el2 = new ImageElement(defTemplate, defRect);
    const cache = new ImageElementFinder().imgElCache;
    cache.set(el1.id, el1);
    el1.equals(cache.get(el1.id)).should.be.true;
    _.isUndefined(cache.get(el2.id)).should.be.true;
    cache.has(el1.id).should.be.true;
    cache.has(el2.id).should.be.false;
  });
  it('once cache reaches max size, should eject image elements', function () {
    const el1 = new ImageElement(defTemplate, defRect);
    const el2 = new ImageElement(defTemplate, defRect);
    const cache = new ImageElementFinder(null, defTemplate.length + 1).imgElCache;
    cache.set(el1.id, el1);
    cache.has(el1.id).should.be.true;
    cache.set(el2.id, el2);
    cache.has(el2.id).should.be.true;
    cache.has(el1.id).should.be.false;
  });
});

describe('getImgElFromArgs', function () {
  it('should return the image element id from json obj in args', function () {
    const imgEl = `${IMAGE_ELEMENT_PREFIX}foo`;
    const args = [1, 'foo', imgEl];
    getImgElFromArgs(args).should.eql(imgEl);
  });
  it('should not return anything if image element id not in args', function () {
    const args = [1, 'foo'];
    _.isUndefined(getImgElFromArgs(args)).should.be.true;
  });
  it('should not find image element id in anything but prefix', function () {
    const notImgEl = `foo${IMAGE_ELEMENT_PREFIX}`;
    const args = [1, 'foo', notImgEl];
    _.isUndefined(getImgElFromArgs(args)).should.be.true;
  });
});
