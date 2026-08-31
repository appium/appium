import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';

import type {Capabilities, Constraints, W3CCapabilities} from '@appium/types';
import {BASE_DESIRED_CAP_CONSTRAINTS} from '@appium/types';

import {
  APPIUM_VENDOR_PREFIX,
  findNonPrefixedCaps,
  mergeCaps,
  parseCaps,
  PREFIXED_APPIUM_OPTS_CAP,
  processCapabilities,
  promoteAppiumOptions,
  stripAppiumPrefixes,
  validateCaps,
} from '../../../lib/basedriver/capabilities';
import {isW3cCaps} from '../../../lib/helpers/capabilities';

/** W3C caps argument for parseCaps, processCapabilities, findNonPrefixedCaps, promoteAppiumOptions */
type TestW3CCaps = W3CCapabilities<Constraints>;

describe('caps', function () {
  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-validate-caps
  describe('#validateCaps', function () {
    it('returns invalid argument error if "capability" is not a JSON object (1)', function () {
      for (const arg of [undefined, null, 1, true, 'string']) {
        assert.throws(() => validateCaps(arg as any), /must be a JSON object/);
      }
    });

    it('returns result {} by default if caps is empty object and no constraints provided (2)', function () {
      assert.deepStrictEqual(validateCaps({}), {});
    });

    describe('throws errors if constraints are not met', function () {
      it('returns invalid argument error if "present" constraint not met on property', function () {
        assert.throws(
          () => validateCaps({} as Capabilities<{foo: {presence: true}}>, {foo: {presence: true}}),
          /'foo' is required/,
        );
      });

      it('returns the capability that was passed in if "skipPresenceConstraint" is false', function () {
        assert.deepStrictEqual(
          validateCaps(
            {} as Capabilities<{foo: {presence: true}}>,
            {foo: {presence: true}},
            {skipPresenceConstraint: true},
          ),
          {},
        );
      });

      it('returns invalid argument error if "isString" constraint not met on property', function () {
        assert.throws(
          () =>
            validateCaps({foo: 1} as unknown as Capabilities<{foo: {isString: true}}>, {
              foo: {isString: true},
            }),
          /'foo' must be of type string/,
        );
      });

      it('returns invalid argument error if "isNumber" constraint not met on property', function () {
        assert.throws(
          () =>
            validateCaps({foo: 'bar'} as unknown as Capabilities<{foo: {isNumber: true}}>, {
              foo: {isNumber: true},
            }),
          /'foo' must be of type number/,
        );
      });

      it('returns invalid argument error if "isBoolean" constraint not met on property', function () {
        assert.throws(
          () =>
            validateCaps({foo: 'bar'} as unknown as Capabilities<{foo: {isBoolean: true}}>, {
              foo: {isBoolean: true},
            }),
          /'foo' must be of type boolean/,
        );
      });

      it('returns invalid argument error if "inclusion" constraint not met on property', function () {
        assert.throws(
          () => validateCaps({foo: '3'}, {foo: {inclusionCaseInsensitive: ['1', '2']}}),
          /'foo' must be contained/,
        );
      });

      it('returns invalid argument error if "inclusionCaseInsensitive" constraint not met on property', function () {
        assert.throws(() => validateCaps({foo: 'a'}, {foo: {inclusion: ['A', 'B', 'C']}}), /'foo' must be contained/);
      });
    });

    it('should not throw errors if constraints are met', function () {
      const caps = {
        number: 1,
        string: 'string',
        present: 'present',
        extra: 'extra',
      };

      const constraints = {
        number: {isNumber: true},
        string: {isString: true},
        present: {presence: true},
        notPresent: {presence: false},
      };

      assert.deepStrictEqual(validateCaps(caps as unknown as Capabilities<typeof constraints>, constraints), caps);
    });
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#dfn-merging-caps
  describe('#mergeCaps', function () {
    it('returns a result that is {} by default (1)', function () {
      assert.deepStrictEqual(mergeCaps(), {});
    });

    it('returns a result that matches primary by default (2, 3)', function () {
      assert.deepStrictEqual(mergeCaps({hello: 'world'}), {hello: 'world'});
    });

    it('returns invalid argument error if primary and secondary have matching properties (4)', function () {
      assert.throws(
        () => mergeCaps({hello: 'world'}, {hello: 'whirl'}),
        /property 'hello' should not exist on both primary [\w\W]* and secondary [\w\W]*/,
      );
    });

    it('returns a result with keys from primary and secondary together', function () {
      const primary = {
        a: 'a',
        b: 'b',
      };
      const secondary = {
        c: 'c',
        d: 'd',
      };
      assert.deepStrictEqual(mergeCaps(primary, secondary), {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
      });
    });
  });

  // Tests based on: https://www.w3.org/TR/webdriver/#processing-capabilities
  describe('#parseCaps', function () {
    let caps: Record<string, any>;

    beforeEach(function () {
      caps = {};
    });

    it('should return invalid argument if no caps object provided', function () {
      assert.throws(() => (parseCaps as any)(), /must be a JSON object/);
    });

    it('sets "requiredCaps" to property named "alwaysMatch" (2)', function () {
      caps.alwaysMatch = {'appium:hello': 'world'};
      assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).requiredCaps, caps.alwaysMatch);
    });

    it('sets "requiredCaps" to empty JSON object if "alwaysMatch" is not an object (2.1)', function () {
      assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).requiredCaps, {});
    });

    it('returns invalid argument error if "requiredCaps" don\'t match "constraints" (2.2)', function () {
      caps.alwaysMatch = {'appium:foo': 1};
      assert.throws(() => parseCaps(caps as TestW3CCaps, {foo: {isString: true}}), /'foo' must be of type string/);
    });

    it('sets "allFirstMatchCaps" to property named "firstMatch" (3)', function () {
      assert.deepStrictEqual((parseCaps as any)({}, [{}]).allFirstMatchCaps, [{}]);
    });

    it('sets "allFirstMatchCaps" to [{}] if "firstMatch" is undefined (3.1)', function () {
      assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).allFirstMatchCaps, [{}]);
    });

    it('returns invalid argument error if "firstMatch" is not an array and is not undefined (3.2)', function () {
      for (const arg of [null, 1, true, 'string']) {
        caps.firstMatch = arg;
        assert.throws(() => parseCaps(caps as TestW3CCaps), /must be a JSON array or undefined/);
      }
    });

    it('has "validatedFirstMatchCaps" property that is empty by default if no valid firstMatch caps were found (4)', function () {
      assert.deepStrictEqual(
        parseCaps(caps as TestW3CCaps, {
          foo: {presence: true},
        }).validatedFirstMatchCaps,
        [],
      );
    });

    describe('returns a "validatedFirstMatchCaps" array (5)', function () {
      it('that equals "firstMatch" if firstMatch is one empty object and there are no constraints', function () {
        caps.firstMatch = [{}];
        assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).validatedFirstMatchCaps, caps.firstMatch);
      });

      it('returns "null" matchedCaps if nothing matches', function () {
        caps.firstMatch = [{}];
        assert.strictEqual(parseCaps(caps as TestW3CCaps, {foo: {presence: true}}).matchedCaps, null);
      });

      it(`should return capabilities if presence constraint is matched in at least one of the 'firstMatch' capabilities objects`, function () {
        caps.alwaysMatch = {
          'appium:foo': 'bar',
        };
        caps.firstMatch = [
          {
            'appium:hello': 'world',
          },
          {
            'appium:goodbye': 'world',
          },
        ];
        assert.deepStrictEqual(
          parseCaps(caps as TestW3CCaps, {
            goodbye: {presence: true},
          }).matchedCaps,
          {
            foo: 'bar',
            goodbye: 'world',
          },
        );
      });

      it(`throws invalid argument if presence constraint is not met on any capabilities`, function () {
        caps.alwaysMatch = {
          'appium:foo': 'bar',
        };
        caps.firstMatch = [
          {
            'appium:hello': 'world',
          },
          {
            'appium:goodbye': 'world',
          },
        ];
        assert.strictEqual(parseCaps(caps as TestW3CCaps, {someAttribute: {presence: true}}).matchedCaps, null);
      });

      it('that equals firstMatch if firstMatch contains two objects that pass the provided constraints', function () {
        caps.alwaysMatch = {
          'appium:foo': 'bar',
        };
        caps.firstMatch = [{'appium:foo': 'bar1'}, {'appium:foo': 'bar2'}];

        const constraints = {
          foo: {
            presence: true,
            isString: true,
          },
        };

        assert.deepStrictEqual(
          parseCaps(caps as TestW3CCaps, constraints).validatedFirstMatchCaps,
          caps.firstMatch.map((c: any) => stripAppiumPrefixes(c)),
        );
      });

      it('returns no vendor prefix error if the firstMatch[2] does not have it because of no bject', function () {
        caps.alwaysMatch = {};
        caps.firstMatch = [{'appium:foo': 'bar'}, 'foo'];
        assert.throws(
          () => parseCaps(caps as TestW3CCaps, {}),
          /All non-standard capabilities should have a vendor prefix/,
        );
      });
    });

    describe('returns a matchedCaps object (6)', function () {
      beforeEach(function () {
        caps.alwaysMatch = {'appium:hello': 'world'};
      });

      it('which is same as alwaysMatch if firstMatch array is not provided', function () {
        assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).matchedCaps, {hello: 'world'});
      });

      it('merges caps together', function () {
        caps.firstMatch = [{'appium:foo': 'bar'}];
        assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).matchedCaps, {
          hello: 'world',
          foo: 'bar',
        });
      });

      it('with merged caps', function () {
        caps.firstMatch = [{'appium:hello': 'bar', 'appium:foo': 'foo'}, {'appium:foo': 'bar'}];
        assert.deepStrictEqual(parseCaps(caps as TestW3CCaps).matchedCaps, {
          hello: 'world',
          foo: 'bar',
        });
      });
    });
  });

  describe('#processCaps', function () {
    it('should return "alwaysMatch" if "firstMatch" and "constraints" were not provided', function () {
      assert.deepStrictEqual(processCapabilities({} as TestW3CCaps), {});
    });

    it('should return merged caps', function () {
      assert.deepStrictEqual(
        processCapabilities({
          alwaysMatch: {'appium:hello': 'world'},
          firstMatch: [{'appium:foo': 'bar'}],
        } as TestW3CCaps),
        {hello: 'world', foo: 'bar'},
      );
    });

    it('should strip out the "appium:" prefix for non-standard capabilities', function () {
      assert.deepStrictEqual(
        processCapabilities({
          alwaysMatch: {'appium:hello': 'world'},
          firstMatch: [{'appium:foo': 'bar'}],
        } as TestW3CCaps),
        {hello: 'world', foo: 'bar'},
      );
    });

    it('should still accept prefixed caps even if they are standard capabilities (https://www.w3.org/TR/webdriver/#dfn-table-of-standard-capabilities)', function () {
      assert.deepStrictEqual(
        processCapabilities({
          alwaysMatch: {'appium:platformName': 'Whatevz'},
          firstMatch: [{'appium:browserName': 'Anything'}],
        } as TestW3CCaps),
        {platformName: 'Whatevz', browserName: 'Anything'},
      );
    });

    it('should prefer standard caps that are non-prefixed to prefixed', function () {
      assert.deepStrictEqual(
        processCapabilities({
          alwaysMatch: {'appium:platformName': 'Foo', platformName: 'Bar'},
          firstMatch: [{'appium:browserName': 'FOO', browserName: 'BAR'}],
        } as unknown as TestW3CCaps),
        {platformName: 'Bar', browserName: 'BAR'},
      );
    });
    it('should throw exception if duplicates in alwaysMatch and firstMatch', function () {
      assert.throws(
        () =>
          processCapabilities({
            alwaysMatch: {platformName: 'Fake', 'appium:fakeCap': 'foobar'},
            firstMatch: [{'appium:platformName': 'bar'}],
          } as TestW3CCaps),
        /should not exist on both primary/,
      );
    });

    it('should not throw an exception if presence constraint is not met on a firstMatch capability', function () {
      const processedCaps = processCapabilities(
        {
          alwaysMatch: {platformName: 'Fake', 'appium:fakeCap': 'foobar'},
          firstMatch: [{'appium:foo': 'bar'}],
        } as TestW3CCaps,
        {
          platformName: {
            presence: true,
          },
          fakeCap: {
            presence: true,
          },
        } as any,
      );

      assert.strictEqual(processedCaps.platformName, 'Fake');
      assert.strictEqual((processedCaps as any).fakeCap, 'foobar');
      assert.strictEqual((processedCaps as any).foo, 'bar');
    });

    it('should throw an exception if no matching caps were found', function () {
      assert.throws(
        () =>
          processCapabilities(
            {
              alwaysMatch: {platformName: 'Fake', 'appium:fakeCap': 'foobar'},
              firstMatch: [{'appium:foo': 'bar'}],
            } as TestW3CCaps,
            {
              platformName: {
                presence: true,
              },
              fakeCap: {
                presence: true,
              },
              missingCap: {
                presence: true,
              },
            } as any,
          ),
        /'missingCap' is required/,
      );
    });

    describe('validate Appium constraints', function () {
      const constraints = {...BASE_DESIRED_CAP_CONSTRAINTS};
      const expectedMatchingCaps = {
        platformName: 'Fake',
        automationName: 'Fake',
        deviceName: 'Fake',
      };

      let matchingCaps: any;
      let caps: any;

      beforeEach(function () {
        matchingCaps = {
          platformName: 'Fake',
          'appium:automationName': 'Fake',
          'appium:deviceName': 'Fake',
        };
      });

      it('should validate when alwaysMatch has the proper caps', function () {
        caps = {
          alwaysMatch: matchingCaps,
          firstMatch: [{}],
        };
        assert.deepStrictEqual(processCapabilities(caps as TestW3CCaps, constraints), expectedMatchingCaps);
      });

      it('should validate when firstMatch[0] has the proper caps', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [matchingCaps],
        };
        assert.deepStrictEqual(processCapabilities(caps as TestW3CCaps, constraints), expectedMatchingCaps);
      });

      it('should validate when alwaysMatch and firstMatch[0] have the proper caps when merged together', function () {
        caps = {
          alwaysMatch: Object.fromEntries(Object.entries(matchingCaps).filter(([key]) => key !== 'appium:deviceName')),
          firstMatch: [{'appium:deviceName': 'Fake'}],
        };
        assert.deepStrictEqual(processCapabilities(caps as TestW3CCaps, constraints), expectedMatchingCaps);
      });

      it('should validate when automationName is omitted', function () {
        caps = {
          alwaysMatch: Object.fromEntries(
            Object.entries(matchingCaps).filter(([key]) => key !== 'appium:automationName'),
          ),
        };
        assert.deepStrictEqual(
          processCapabilities(caps as TestW3CCaps, constraints),
          Object.fromEntries(Object.entries(expectedMatchingCaps).filter(([key]) => key !== 'automationName')),
        );
      });

      it('should pass if first element in "firstMatch" does validate and second element does not', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [matchingCaps, {'appium:badCaps': 'badCaps'}],
        };
        assert.deepStrictEqual(processCapabilities(caps as TestW3CCaps, constraints), expectedMatchingCaps);
      });

      it('should pass if first element in "firstMatch" does not validate and second element does', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [{'appium:badCaps': 'badCaps'}, matchingCaps],
        };
        assert.deepStrictEqual(processCapabilities(caps as TestW3CCaps, constraints), expectedMatchingCaps);
      });

      it('should fail when bad parameters are passed in more than one firstMatch capability', function () {
        caps = {
          alwaysMatch: {},
          firstMatch: [
            {
              'appium:bad': 'params',
            },
            {
              'appium:more': 'bad-params',
            },
          ],
        };
        assert.throws(
          () => processCapabilities(caps as TestW3CCaps, constraints),
          /Could not find matching capabilities/,
        );
      });
    });
  });
  describe('.findNonPrefixedCaps', function () {
    it('should find alwaysMatch caps with no prefix', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          alwaysMatch: {'non-standard': 'dummy'},
        } as unknown as TestW3CCaps),
        ['non-standard'],
      );
    });
    it('should not find a standard cap in alwaysMatch', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          alwaysMatch: {platformName: 'Any'},
        } as unknown as TestW3CCaps),
        [],
      );
    });
    it('should find firstMatch caps with no prefix', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          alwaysMatch: {},
          firstMatch: [{'non-standard': 'dummy'}],
        } as unknown as TestW3CCaps),
        ['non-standard'],
      );
    });
    it('should not find a standard cap in prefix', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          alwaysMatch: {},
          firstMatch: [{platformName: 'Any'}],
        } as unknown as TestW3CCaps),
        [],
      );
    });
    it('should find firstMatch caps in second item of firstMatch array', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          alwaysMatch: {},
          firstMatch: [{}, {'non-standard': 'dummy'}],
        } as unknown as TestW3CCaps),
        ['non-standard'],
      );
    });
    it('should remove duplicates from alwaysMatch and firstMatch', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          alwaysMatch: {'non-standard': 'something'},
          firstMatch: [{'non-standard': 'dummy'}],
        } as unknown as TestW3CCaps),
        ['non-standard'],
      );
    });
    it('should remove duplicates from firstMatch', function () {
      assert.deepStrictEqual(
        findNonPrefixedCaps({
          firstMatch: [{'non-standard': 'dummy'}, {'non-standard': 'dummy 2'}],
        } as unknown as TestW3CCaps),
        ['non-standard'],
      );
    });
    it('should remove duplicates and keep standard capabilities', function () {
      const alwaysMatch = {
        platformName: 'Fake',
        nonStandardOne: 'non-standard',
        nonStandardTwo: 'non-standard',
      };
      const firstMatch = [
        {
          nonStandardThree: 'non-standard',
          nonStandardFour: 'non-standard',
          browserName: 'FakeBrowser',
        },
        {
          nonStandardThree: 'non-standard',
          nonStandardFour: 'non-standard',
          nonStandardFive: 'non-standard',
          browserVersion: 'whateva',
        },
      ];
      assert.deepStrictEqual(findNonPrefixedCaps({alwaysMatch, firstMatch} as unknown as TestW3CCaps), [
        'nonStandardOne',
        'nonStandardTwo',
        'nonStandardThree',
        'nonStandardFour',
        'nonStandardFive',
      ]);
    });
  });

  describe('#promoteAppiumOptions', function () {
    const nonPrefixedAppiumCaps = {
      platformVersion: '14.4',
      deviceName: 'iPhone 11',
      app: '/foo/bar.app.zip',
      automationName: 'XCUITest',
    };
    const appiumCaps = Object.fromEntries(
      Object.entries(nonPrefixedAppiumCaps).map(([key, value]) => [`${APPIUM_VENDOR_PREFIX}${key}`, value]),
    );
    const standardCaps = {
      platformName: 'iOS',
    };
    it('should do nothing to caps that dont include the options', function () {
      assert.deepStrictEqual(
        promoteAppiumOptions({
          alwaysMatch: {...standardCaps, ...appiumCaps},
        } as unknown as TestW3CCaps),
        {
          alwaysMatch: {
            ...standardCaps,
            ...appiumCaps,
          },
        },
      );
    });
    it('should promote options', function () {
      assert.deepStrictEqual(
        promoteAppiumOptions({
          alwaysMatch: {
            ...standardCaps,
            [PREFIXED_APPIUM_OPTS_CAP]: {...nonPrefixedAppiumCaps},
          },
        } as unknown as TestW3CCaps),
        {
          alwaysMatch: {
            ...standardCaps,
            ...appiumCaps,
          },
        },
      );
    });
    it('should promote options inside firstMatch', function () {
      assert.deepStrictEqual(
        promoteAppiumOptions({
          alwaysMatch: {},
          firstMatch: [
            {
              ...standardCaps,
              [PREFIXED_APPIUM_OPTS_CAP]: {...nonPrefixedAppiumCaps},
            },
          ],
        } as unknown as TestW3CCaps),
        {
          alwaysMatch: {},
          firstMatch: [
            {
              ...standardCaps,
              ...appiumCaps,
            },
          ],
        },
      );
    });
    it('should overwrite caps found on the top level', function () {
      assert.deepStrictEqual(
        promoteAppiumOptions({
          alwaysMatch: {
            ...standardCaps,
            'appium:foo': 'bar',
            [PREFIXED_APPIUM_OPTS_CAP]: {...nonPrefixedAppiumCaps, foo: 'baz'},
          },
        } as unknown as TestW3CCaps),
        {
          alwaysMatch: {
            ...standardCaps,
            ...appiumCaps,
            'appium:foo': 'baz',
          },
        },
      );
    });
  });

  describe('#isW3cCaps', function () {
    it('should drop invalid W3C capabilities', function () {
      for (const invalidCaps of [
        null,
        undefined,
        [],
        {},
        {firstMatch: null},
        {firtMatch: [{}]},
        {alwaysMatch: null},
        {firstMatch: [{}], alwaysMatch: null},
        {firstMatch: [], alwaysMatch: {}},
        {firstMatch: []},
        {firstMatch: {}},
        {alwaysMatch: []},
      ] as any[]) {
        assert.strictEqual(isW3cCaps(invalidCaps), false);
      }
    });

    it('should accept valid W3C capabilities', function () {
      for (const validCaps of [
        {firstMatch: [{}]},
        {firstMatch: [{}], alaysMatch: {}},
        {firtMatch: [{}], alwaysMatch: {}},
        {alwaysMatch: {}},
      ] as any[]) {
        assert.strictEqual(isW3cCaps(validCaps), true);
      }
    });
  });
});
