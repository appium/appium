import assert from 'node:assert/strict';
import {describe, it, beforeEach, afterEach} from 'node:test';

import type {ExtensionType} from '@appium/types';
import type {ArgumentOptions} from 'argparse';

import {PLUGIN_TYPE} from '../../../lib/constants.js';
import {finalizeSchema, registerSchema, resetSchema} from '../../../lib/schema/index.js';
import {toParserArgs} from '../../../lib/schema/cli-args.js';

type ParserArgSpec = ArgumentOptions & {
  type?: (v: string) => unknown;
};

type ParserArgsMap = Record<string, ParserArgSpec>;

describe('cli-args', function () {
  interface GetArgsOpts {
    extName?: string;
    extType?: string;
    schema?: object;
  }

  async function getArgs(opts: GetArgsOpts = {}) {
    const {extName, extType, schema} = opts;
    if (schema && extName && extType) {
      await registerSchema(extType as ExtensionType, extName, schema as Parameters<typeof registerSchema>[2]);
    }
    await finalizeSchema();
    return Object.fromEntries([...toParserArgs()]) as ParserArgsMap;
  }

  beforeEach(resetSchema);
  afterEach(resetSchema);

  describe('toParserArgs()', function () {
    describe('schema contents', function () {
      const extName = 'blob';
      const extType = PLUGIN_TYPE;

      describe('type', function () {
        let result: ParserArgsMap;

        describe('boolean', function () {
          beforeEach(async function () {
            const schema = {
              properties: {foo: {type: 'boolean'}},
              type: 'object',
            };
            result = await getArgs({schema, extName, extType});
          });

          it('should return options containing `action` prop of `store_const` and no `type`', function () {
            assert.strictEqual(result['--plugin-blob-foo'].action, 'store_const');
          });

          it('should not contain a `metavar` property', function () {
            assert.ok(!Object.hasOwn(result['--plugin-blob-foo'], 'metavar'));
          });
        });

        describe('object', function () {
          beforeEach(async function () {
            const schema = {
              properties: {foo: {type: 'object'}},
              type: 'object',
            };
            result = await getArgs({schema, extName, extType});
          });

          it('should use the `json` transformer', function () {
            assert.ok(Object.hasOwn(result['--plugin-blob-foo'], 'type'));
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            assert.strictEqual(result['--plugin-blob-foo'].metavar, 'FOO');
          });
        });

        describe('array', function () {
          beforeEach(async function () {
            const schema = {properties: {foo: {type: 'array'}}, type: 'object'};
            result = await getArgs({schema, extName, extType});
          });

          it('should use the `csv` transformer', function () {
            assert.ok(Object.hasOwn(result['--plugin-blob-foo'], 'type'));
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            assert.strictEqual(result['--plugin-blob-foo'].metavar, 'FOO');
          });
        });

        describe('number', function () {
          beforeEach(async function () {
            const schema = {
              properties: {foo: {type: 'number'}},
              type: 'object',
            };
            result = await getArgs({schema, extName, extType});
          });

          it('should parse the value as a float', function () {
            assert.strictEqual(result['--plugin-blob-foo'].type!('10.5'), 10.5);
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            assert.strictEqual(result['--plugin-blob-foo'].metavar, 'FOO');
          });
        });

        describe('integer', function () {
          beforeEach(async function () {
            const schema = {
              properties: {foo: {type: 'integer'}},
              type: 'object',
            };
            result = await getArgs({schema, extName, extType});
          });

          it('should parse the value as an integer', function () {
            assert.strictEqual(result['--plugin-blob-foo'].type!('10.5'), 10);
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            assert.strictEqual(result['--plugin-blob-foo'].metavar, 'FOO');
          });
        });

        describe('string', function () {
          beforeEach(async function () {
            const schema = {
              properties: {foo: {type: 'string'}},
              type: 'object',
            };
            result = await getArgs({schema, extName, extType});
          });

          it('should parse the value as a string', function () {
            assert.strictEqual(result['--plugin-blob-foo'].type!('10.5'), '10.5');
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            assert.strictEqual(result['--plugin-blob-foo'].metavar, 'FOO');
          });
        });

        describe('null', function () {
          it('should throw', async function () {
            const schema = {properties: {foo: {type: 'null'}}, type: 'object'};
            await assert.rejects(getArgs({extType, extName, schema}), {
              name: 'TypeError',
              message: /unknown or disallowed/,
            });
          });
        });

        describe('(unknown)', function () {
          it('should throw', async function () {
            const schema = {
              properties: {foo: {type: 'donkey'}},
              type: 'object',
            };
            await assert.rejects(getArgs({extType, extName, schema}), {name: 'Error', message: /schema is invalid/});
          });
        });
      });

      describe('appiumCliAliases', function () {
        let result: ParserArgsMap;

        it('should not allow short aliases for extensions', async function () {
          const schema = {
            properties: {
              foo: {type: 'string', appiumCliAliases: ['fooooo', 'F']},
            },
            type: 'object',
          };
          result = await getArgs({schema, extName, extType});
          assert.ok(Object.hasOwn(result, '--plugin-blob-foo,--plugin-blob-fooooo,--plugin-blob-F'));
        });
      });

      describe('appiumCliDescription', function () {
        let result: ParserArgsMap;

        it('should be preferred over `description`', async function () {
          const schema = {
            properties: {
              foo: {
                type: 'string',
                appiumCliDescription: 'foo',
                description: 'bar',
              },
            },
            type: 'object',
          };
          result = await getArgs({schema, extName, extType});
          assert.strictEqual(result['--plugin-blob-foo'].help, 'foo');
        });
      });

      describe('appiumCliTransformer', function () {
        let result: ParserArgsMap;

        it('should use the transformer', async function () {
          const schema = {
            properties: {foo: {type: 'string', appiumCliTransformer: 'json'}},
            type: 'object',
          };
          result = await getArgs({schema, extName, extType});
          assert.deepStrictEqual(result['--plugin-blob-foo'].type!('{"herp": "derp"}'), {
            herp: 'derp',
          });
        });

        it('should error if the value is not valid for the transformer', async function () {
          const schema = {
            properties: {foo: {type: 'object'}},
            type: 'object',
          };
          result = await getArgs({schema, extName, extType});
          assert.throws(() => result['--plugin-blob-foo'].type!('123'), /must be a plain object/i);
        });

        describe('when used with `enum`', function () {
          describe('and enum members are invalid as per the transformer', function () {
            describe('when provided an enum member', function () {
              it('should throw', async function () {
                const schema = {
                  properties: {
                    foo: {
                      type: 'string',
                      appiumCliTransformer: 'json',
                      enum: ['herp', 'derp'],
                    },
                  },
                  type: 'object',
                };
                result = await getArgs({schema, extName, extType});
                assert.throws(() => result['--plugin-blob-foo'].type!('herp'), /must be a valid json/i);
              });
            });
          });

          describe('and enum members are valid as per the transformer', function () {
            describe('when provided an enum member', function () {
              it('should return a transformed value', async function () {
                const schema = {
                  properties: {
                    foo: {
                      type: 'string',
                      appiumCliTransformer: 'json',
                      enum: ['{"herp": "derp"}', '{"derp": "herp"}'],
                    },
                  },
                  type: 'object',
                };
                result = await getArgs({schema, extName, extType});
                assert.deepStrictEqual(result['--plugin-blob-foo'].type!('{"herp": "derp"}'), {
                  herp: 'derp',
                });
              });
            });

            describe('when not provided an enum member', function () {
              it('should throw', async function () {
                const schema = {
                  properties: {
                    foo: {
                      type: 'string',
                      appiumCliTransformer: 'json',
                      enum: ['{"herp": "derp"}', '{"derp": "herp"}'],
                    },
                  },
                  type: 'object',
                };
                result = await getArgs({schema, extName, extType});
                assert.throws(
                  () => result['--plugin-blob-foo'].type!('{"georgy": "porgy"}'),
                  /one of the allowed values/i,
                );
              });
            });
          });
        });
      });

      describe('enum', function () {
        describe('when used with a non-`string` type', function () {
          it('should throw', async function () {
            const schema = {
              properties: {
                foo: {
                  type: 'number',
                  enum: ['herp', 'derp'],
                },
              },
              type: 'object',
            };
            await assert.rejects(getArgs({schema, extName, extType}), {
              name: 'TypeError',
              message: /`enum` is only supported for `type: 'string'`/i,
            });
          });
        });

        describe('when used with a `string` type', function () {
          it('should set `choices` prop', async function () {
            const schema = {
              properties: {
                foo: {
                  type: 'string',
                  enum: ['herp', 'derp'],
                },
              },
              type: 'object',
            };
            const result = await getArgs({schema, extName, extType});
            assert.ok(Object.hasOwn(result['--plugin-blob-foo'], 'choices'));
            assert.deepStrictEqual(result['--plugin-blob-foo'].choices, ['herp', 'derp']);
          });
        });
      });
    });
  });
});
