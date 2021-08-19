import { parseCaps, validateCaps, mergeCaps, processCapabilities, findNonPrefixedCaps,
         promoteAppiumOptions, APPIUM_OPTS_CAP, stripAppiumPrefixes } from '../../lib/basedriver/capabilities';
import _ from 'lodash';
import { desiredCapabilityConstraints } from '../../lib/basedriver/desired-caps';


describe('caps', function () {

  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-validate-caps
  describe('#validateCaps', function () {
    it('returns invalid argument error if "capability" is not a JSON object (1)', function () {
      for (let arg of [undefined, null, 1, true, 'string']) {
        (function () { validateCaps(arg); }).should.throw(/must be a JSON object/);
      }
    });

    it('returns result {} by default if caps is empty object and no constraints provided (2)', function () {
      validateCaps({}).should.deep.equal({});
    });

    describe('throws errors if constraints are not met', function () {
      it('returns invalid argument error if "present" constraint not met on property', function () {
        (() => validateCaps({}, {foo: {presence: true}})).should.throw(/'foo' can't be blank/);
      });

      it('returns the capability that was passed in if "skipPresenceConstraint" is false', function () {
        validateCaps({}, {foo: {presence: true}}, {skipPresenceConstraint: true}).should.deep.equal({});
      });

      it('returns invalid argument error if "isString" constraint not met on property', function () {
        (() => validateCaps({foo: 1}, {foo: {isString: true}})).should.throw(/'foo' must be of type string/);
      });

      it('returns invalid argument error if "isNumber" constraint not met on property', function () {
        (() => validateCaps({foo: 'bar'}, {foo: {isNumber: true}})).should.throw(/'foo' must be of type number/);
      });

      it('returns invalid argument error if "isBoolean" constraint not met on property', function () {
        (() => validateCaps({foo: 'bar'}, {foo: {isBoolean: true}})).should.throw(/'foo' must be of type boolean/);
      });

      it('returns invalid argument error if "inclusion" constraint not met on property', function () {
        (() => validateCaps({foo: '3'}, {foo: {inclusionCaseInsensitive: ['1', '2']}})).should.throw(/'foo' 3 not part of 1,2/);
      });

      it('returns invalid argument error if "inclusionCaseInsensitive" constraint not met on property', function () {
        (() => validateCaps({foo: 'a'}, {foo: {inclusion: ['A', 'B', 'C']}})).should.throw(/'foo' a is not included in the list/);
      });
    });

    it('should not throw errors if constraints are met', function () {
      let caps = {
        number: 1,
        string: 'string',
        present: 'present',
        extra: 'extra',
      };

      let constraints = {
        number: {isNumber: true},
        string: {isString: true},
        present: {presence: true},
        notPresent: {presence: false},
      };

      validateCaps(caps, constraints).should.deep.equal(caps);
    });
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-merging-caps
  describe('#mergeCaps', function () {
    it('returns a result that is {} by default (1)', function () {
      mergeCaps().should.deep.equal({});
    });

    it('returns a result that matches primary by default (2, 3)', function () {
      mergeCaps({hello: 'world'}).should.deep.equal({hello: 'world'});
    });

    it('returns invalid argument error if primary and secondary have matching properties (4)', function () {
      (() => mergeCaps({hello: 'world'}, {hello: 'whirl'})).should.throw(/property 'hello' should not exist on both primary [\w\W]* and secondary [\w\W]*/);
    });

    it('returns a result with keys from primary and secondary together', function () {
      let primary = {
        a: 'a',
        b: 'b',
      };
      let secondary = {
        c: 'c',
        d: 'd',
      };
      mergeCaps(primary, secondary).should.deep.equal({
        a: 'a', b: 'b', c: 'c', d: 'd',
      });
    });
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#processing-capabilities
  describe('#parseCaps', function () {
    let caps;

    beforeEach(function () {
      caps = {};
    });

    it('should return invalid argument if no caps object provided', function () {
      (() => parseCaps()).should.throw(/must be a JSON object/);
    });

    it('sets "requiredCaps" to property named "alwaysMatch" (2)', function () {
      caps.alwaysMatch = {'appium:hello': 'world'};
      parseCaps(caps).requiredCaps.should.deep.equal(caps.alwaysMatch);
    });

    it('sets "requiredCaps" to empty JSON object if "alwaysMatch" is not an object (2.1)', function () {
      parseCaps(caps).requiredCaps.should.deep.equal({});
    });

    it('returns invalid argument error if "requiredCaps" don\'t match "constraints" (2.2)', function () {
      caps.alwaysMatch = {'appium:foo': 1};
      (() => parseCaps(caps, {foo: {isString: true}})).should.throw(/'foo' must be of type string/);
    });

    it('sets "allFirstMatchCaps" to property named "firstMatch" (3)', function () {
      parseCaps({}, [{}]).allFirstMatchCaps.should.deep.equal([{}]);
    });

    it('sets "allFirstMatchCaps" to [{}] if "firstMatch" is undefined (3.1)', function () {
      parseCaps({}).allFirstMatchCaps.should.deep.equal([{}]);
    });

    it('returns invalid argument error if "firstMatch" is not an array and is not undefined (3.2)', function () {
      for (let arg of [null, 1, true, 'string']) {
        caps.firstMatch = arg;
        (function () { parseCaps(caps); }).should.throw(/must be a JSON array or undefined/);
      }
    });

    it('has "validatedFirstMatchCaps" property that is empty by default if no valid firstMatch caps were found (4)', function () {
      parseCaps(caps, {foo: {presence: true}}).validatedFirstMatchCaps.should.deep.equal([]);
    });

    describe('returns a "validatedFirstMatchCaps" array (5)', function () {
      it('that equals "firstMatch" if firstMatch is one empty object and there are no constraints', function () {
        caps.firstMatch = [{}];
        parseCaps(caps).validatedFirstMatchCaps.should.deep.equal(caps.firstMatch);
      });

      it('returns "null" matchedCaps if nothing matches', function () {
        caps.firstMatch = [{}];
        should.equal(parseCaps(caps, {foo: {presence: true}}).matchedCaps, null);
      });

      it(`should return capabilities if presence constraint is matched in at least one of the 'firstMatch' capabilities objects`, function () {
        caps.alwaysMatch = {
          'appium:foo': 'bar',
        };
        caps.firstMatch = [{
          'appium:hello': 'world',
        }, {
          'appium:goodbye': 'world',
        }];
        parseCaps(caps, {goodbye: {presence: true}}).matchedCaps.should.deep.equal({
          foo: 'bar',
          goodbye: 'world',
        });
      });

      it(`throws invalid argument if presence constraint is not met on any capabilities`, function () {
        caps.alwaysMatch = {
          'appium:foo': 'bar',
        };
        caps.firstMatch = [{
          'appium:hello': 'world',
        }, {
          'appium:goodbye': 'world',
        }];
        should.equal(parseCaps(caps, {someAttribute: {presence: true}}).matchedCaps, null);
      });

      it('that equals firstMatch if firstMatch contains two objects that pass the provided constraints', function () {
        caps.alwaysMatch = {
          'appium:foo': 'bar'
        };
        caps.firstMatch = [
          {'appium:foo': 'bar1'},
          {'appium:foo': 'bar2'},
        ];

        let constraints = {
          foo: {
            presence: true,
            isString: true,
          }
        };

        parseCaps(caps, constraints).validatedFirstMatchCaps.should.deep.equal(caps.firstMatch);
      });

      it('returns no vendor prefix error if the firstMatch[2] does not have it because of no bject', function () {
        caps.alwaysMatch = {};
        caps.firstMatch = [{'appium:foo': 'bar'}, 'foo'];
        (() => parseCaps(caps, {})).should.throw(/All non-standard capabilities should have a vendor prefix/);
      });
    });

    describe('returns a matchedCaps object (6)', function () {
      beforeEach(function () {
        caps.alwaysMatch = {'appium:hello': 'world'};
      });

      it('which is same as alwaysMatch if firstMatch array is not provided', function () {
        parseCaps(caps).matchedCaps.should.deep.equal({hello: 'world'});
      });

      it('merges caps together', function () {
        caps.firstMatch = [{'appium:foo': 'bar'}];
        parseCaps(caps).matchedCaps.should.deep.equal({hello: 'world', foo: 'bar'});
      });

      it('with merged caps', function () {
        caps.firstMatch = [{'appium:hello': 'bar', 'appium:foo': 'foo'}, {'appium:foo': 'bar'}];
        parseCaps(caps).matchedCaps.should.deep.equal({hello: 'world', foo: 'bar'});
      });
    });
  });

  describe('#processCaps', function () {
    it('should return "alwaysMatch" if "firstMatch" and "constraints" were not provided', function () {
      processCapabilities({}).should.deep.equal({});
    });

    it('should return merged caps', function () {
      processCapabilities({
        alwaysMatch: {'appium:hello': 'world'},
        firstMatch: [{'appium:foo': 'bar'}]
      }).should.deep.equal({hello: 'world', foo: 'bar'});
    });

    it('should strip out the "appium:" prefix for non-standard capabilities', function () {
      processCapabilities({
        alwaysMatch: {'appium:hello': 'world'},
        firstMatch: [{'appium:foo': 'bar'}]
      }).should.deep.equal({hello: 'world', foo: 'bar'});
    });

    it('should still accept prefixed caps even if they are standard capabilities (https://www.w3.org/TR/webdriver/#dfn-table-of-standard-capabilities)', function () {
      processCapabilities({
        alwaysMatch: {'appium:platformName': 'Whatevz'},
        firstMatch: [{'appium:browserName': 'Anything'}],
      }).should.deep.equal({platformName: 'Whatevz', browserName: 'Anything'});
    });

    it('should prefer standard caps that are non-prefixed to prefixed', function () {
      processCapabilities({
        alwaysMatch: {'appium:platformName': 'Foo', 'platformName': 'Bar'},
        firstMatch: [{'appium:browserName': 'FOO', 'browserName': 'BAR'}],
      }).should.deep.equal({platformName: 'Bar', browserName: 'BAR'});
    });
    it('should throw exception if duplicates in alwaysMatch and firstMatch', function () {
      (() => processCapabilities({
        alwaysMatch: {'platformName': 'Fake', 'appium:fakeCap': 'foobar'},
        firstMatch: [{'appium:platformName': 'bar'}],
      })).should.throw(/should not exist on both primary/);
    });

    it('should not throw an exception if presence constraint is not met on a firstMatch capability', function () {
      const caps = processCapabilities({
        alwaysMatch: {'platformName': 'Fake', 'appium:fakeCap': 'foobar'},
        firstMatch: [{'appium:foo': 'bar'}],
      }, {
        platformName: {
          presence: true,
        },
        fakeCap: {
          presence: true
        },
      });

      caps.platformName.should.equal('Fake');
      caps.fakeCap.should.equal('foobar');
      caps.foo.should.equal('bar');
    });

    it('should throw an exception if no matching caps were found', function () {
      (() => processCapabilities({
        alwaysMatch: {'platformName': 'Fake', 'appium:fakeCap': 'foobar'},
        firstMatch: [{'appium:foo': 'bar'}],
      }, {
        platformName: {
          presence: true,
        },
        fakeCap: {
          presence: true
        },
        missingCap: {
          presence: true,
        },
      })).should.throw(/'missingCap' can't be blank/);
    });

    describe('validate Appium constraints', function () {
      const constraints = {...desiredCapabilityConstraints};
      const expectedMatchingCaps = {'platformName': 'Fake', 'automationName': 'Fake', 'deviceName': 'Fake'};

      let matchingCaps;
      let caps;

      beforeEach(function () {
        matchingCaps = {
          'platformName': 'Fake',
          'appium:automationName': 'Fake',
          'appium:deviceName': 'Fake'
        };
      });

      it('should validate when alwaysMatch has the proper caps', function () {
        caps = {
          alwaysMatch: matchingCaps,
          firstMatch: [{}],
        };
        processCapabilities(caps, constraints).should.deep.equal(expectedMatchingCaps);
      });


      it('should validate when firstMatch[0] has the proper caps', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [matchingCaps],
        };
        processCapabilities(caps, constraints).should.deep.equal(expectedMatchingCaps);
      });

      it('should validate when alwaysMatch and firstMatch[0] have the proper caps when merged together', function () {
        caps = {
          alwaysMatch: _.omit(matchingCaps, ['appium:deviceName']),
          firstMatch: [{'appium:deviceName': 'Fake'}],
        };
        processCapabilities(caps, constraints).should.deep.equal(expectedMatchingCaps);
      });

      it('should validate when automationName is omitted', function () {
        caps = {
          alwaysMatch: _.omit(matchingCaps, ['appium:automationName']),
        };
        processCapabilities(caps, constraints).should.deep.equal(_.omit(expectedMatchingCaps, 'automationName'));
      });

      it('should pass if first element in "firstMatch" does validate and second element does not', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [
            matchingCaps,
            {'appium:badCaps': 'badCaps'},
          ],
        };
        processCapabilities(caps, constraints).should.deep.equal(expectedMatchingCaps);
      });

      it('should pass if first element in "firstMatch" does not validate and second element does', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [
            {'appium:badCaps': 'badCaps'},
            matchingCaps,
          ],
        };
        processCapabilities(caps, constraints).should.deep.equal(expectedMatchingCaps);
      });

      it('should fail when bad parameters are passed in more than one firstMatch capability', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [{
            'appium:bad': 'params',
          }, {
            'appium:more': 'bad-params',
          }],
        };
        (() => processCapabilities(caps, constraints)).should.throw(/Could not find matching capabilities/);
      });
    });
  });
  describe('.findNonPrefixedCaps', function () {
    it('should find alwaysMatch caps with no prefix', function () {
      findNonPrefixedCaps({alwaysMatch: {
        'non-standard': 'dummy',
      }}).should.eql(['non-standard']);
    });
    it('should not find a standard cap in alwaysMatch', function () {
      findNonPrefixedCaps({alwaysMatch: {
        'platformName': 'Any',
      }}).should.eql([]);
    });
    it('should find firstMatch caps with no prefix', function () {
      findNonPrefixedCaps({alwaysMatch: {}, firstMatch: [{
        'non-standard': 'dummy',
      }]}).should.eql(['non-standard']);
    });
    it('should not find a standard cap in prefix', function () {
      findNonPrefixedCaps({alwaysMatch: {}, firstMatch: [{
        'platformName': 'Any',
      }]}).should.eql([]);
    });
    it('should find firstMatch caps in second item of firstMatch array', function () {
      findNonPrefixedCaps({alwaysMatch: {}, firstMatch: [{}, {
        'non-standard': 'dummy',
      }]}).should.eql(['non-standard']);
    });
    it('should remove duplicates from alwaysMatch and firstMatch', function () {
      findNonPrefixedCaps({alwaysMatch: {
        'non-standard': 'something',
      }, firstMatch: [{
        'non-standard': 'dummy',
      }]}).should.eql(['non-standard']);
    });
    it('should remove duplicates from firstMatch', function () {
      findNonPrefixedCaps({firstMatch: [{
        'non-standard': 'dummy',
      }, {
        'non-standard': 'dummy 2',
      }]}).should.eql(['non-standard']);
    });
    it('should remove duplicates and keep standard capabilities', function () {
      const alwaysMatch = {
        platformName: 'Fake',
        nonStandardOne: 'non-standard',
        nonStandardTwo: 'non-standard',
      };
      const firstMatch = [
        {nonStandardThree: 'non-standard', nonStandardFour: 'non-standard', browserName: 'FakeBrowser'},
        {nonStandardThree: 'non-standard', nonStandardFour: 'non-standard', nonStandardFive: 'non-standard', browserVersion: 'whateva'},
      ];
      findNonPrefixedCaps({alwaysMatch, firstMatch}).should.eql(['nonStandardOne', 'nonStandardTwo', 'nonStandardThree', 'nonStandardFour', 'nonStandardFive']);
    });
  });

  describe('#promoteAppiumOptions', function () {
    const appiumCaps = {
      'appium:platformVersion': '14.4',
      'appium:deviceName': 'iPhone 11',
      'appium:app': '/foo/bar.app.zip',
      'appium:automationName': 'XCUITest',
    };
    const nonAppiumCaps = {
      platformName: 'iOS',
    };
    const appiumUnprefixedCaps = _.clone(appiumCaps);
    stripAppiumPrefixes(appiumUnprefixedCaps);
    const simpleCaps = {
      ...nonAppiumCaps,
      ...appiumUnprefixedCaps,
    };
    it('should do nothing to caps that dont include the options', function () {
      promoteAppiumOptions(simpleCaps).should.eql(simpleCaps);
    });
    it('should promote options', function () {
      const caps = {
        ...nonAppiumCaps,
        [APPIUM_OPTS_CAP]: {
          ...appiumUnprefixedCaps,
        }
      };
      promoteAppiumOptions(caps).should.eql(simpleCaps);
    });
    it('should get rid of prefixes if caps inside options are prefixed', function () {
      const caps = {
        ...nonAppiumCaps,
        [APPIUM_OPTS_CAP]: {
          ...appiumCaps,
        }
      };
      promoteAppiumOptions(caps).should.eql(simpleCaps);
    });
    it('should preserve non-appium vendor prefixes', function () {
      const googCaps = {'goog:chromeOptions': {foo: 'bar'}};
      const caps = {
        ...nonAppiumCaps,
        [APPIUM_OPTS_CAP]: {
          ...appiumCaps,
          ...googCaps,
        },
      };
      promoteAppiumOptions(caps).should.eql({
        ...simpleCaps,
        ...googCaps,
      });
    });
    it('should overwrite caps found on the top level', function () {
      const caps = {
        ...nonAppiumCaps,
        foo: 'bar',
        [APPIUM_OPTS_CAP]: {
          ...appiumCaps,
          foo: 'baz',
        }
      };
      promoteAppiumOptions(caps).should.eql({
        ...simpleCaps,
        foo: 'baz',
      });
    });
  });
});
