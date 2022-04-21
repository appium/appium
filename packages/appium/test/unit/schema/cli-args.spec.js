// @ts-check

import _ from 'lodash';
import { PLUGIN_TYPE } from '../../../lib/constants';
import { finalizeSchema, registerSchema, resetSchema } from '../../../lib/schema';
import { toParserArgs } from '../../../lib/schema/cli-args';
import { transformers } from '../../../lib/schema/cli-transformers';

const {expect} = chai;

describe('cli-args', function () {
  describe('toParserArgs()', function () {
    /**
     *
     * @param {*} opts
     * @returns
     */
    function getArgs (opts = {}) {
      let {extName, extType, schema} = opts;
      if (schema && extName && extType) {
        registerSchema(extType, extName, schema);
      }
      finalizeSchema();
      return _.fromPairs([...toParserArgs()]);
    }

    beforeEach(resetSchema);

    afterEach(resetSchema);

    describe('schema contents', function () {
      const extName = 'blob';
      const extType = PLUGIN_TYPE;

      describe('type', function () {
        let result;

        describe('boolean', function () {
          beforeEach(function () {
            const schema = {properties: {foo: {type: 'boolean'}}, type: 'object'};
            result = getArgs({schema, extName, extType});
          });

          it('should return options containing `action` prop of `store_const` and no `type`', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'action',
              'store_const',
            );
          });

          it('should not contain a `metavar` property', function () {
            expect(result['--plugin-blob-foo']).not.to.have.property('metavar');
          });
        });

        describe('object', function () {
          beforeEach(function () {
            const schema = {properties: {foo: {type: 'object'}}, type: 'object'};
            result = getArgs({schema, extName, extType});
          });

          it('should use the `json` transformer', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'type',
              transformers.json,
            );
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'metavar',
              'FOO',
            );
          });
        });

        describe('array', function () {
          beforeEach(function () {
            const schema = {properties: {foo: {type: 'array'}}, type: 'object'};
            result = getArgs({schema, extName, extType});
          });

          it('should use the `csv` transformer', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'type',
              transformers.csv,
            );
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'metavar',
              'FOO',
            );
          });
        });

        describe('number', function () {
          beforeEach(function () {
            const schema = {properties: {foo: {type: 'number'}}, type: 'object'};
            result = getArgs({schema, extName, extType});
          });

          it('should parse the value as a float', function () {
            expect(result['--plugin-blob-foo'].type('10.5')).to.equal(10.5);
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'metavar',
              'FOO',
            );
          });
        });

        describe('integer', function () {
          beforeEach(function () {
            const schema = {properties: {foo: {type: 'integer'}}, type: 'object'};
            result = getArgs({schema, extName, extType});
          });

          it('should parse the value as an integer', function () {
            expect(result['--plugin-blob-foo'].type('10.5')).to.equal(10);
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'metavar',
              'FOO',
            );
          });
        });

        describe('string', function () {
          beforeEach(function () {
            const schema = {
              properties: {foo: {type: 'string'}},
              type: 'object',
            };
            result = getArgs({schema, extName, extType});
          });

          it('should parse the value as an integer', function () {
            expect(result['--plugin-blob-foo'].type('10.5')).to.equal('10.5');
          });

          it('should contain a SCREAMING_SNAKE_CASE `metavar` prop', function () {
            expect(result['--plugin-blob-foo']).to.have.property(
              'metavar',
              'FOO',
            );
          });
        });

        describe('null', function () {
          it('should throw', function () {
            const schema = {properties: {foo: {type: 'null'}}, type: 'object'};
            expect(() => getArgs({extType, extName, schema})).to.throw(
              TypeError,
              /unknown or disallowed/,
            );
          });
        });

        describe('(unknown)', function () {
          it('should throw', function () {
            const schema = {
              properties: {foo: {type: 'donkey'}},
              type: 'object',
            };
            expect(() => getArgs({extType, extName, schema})).to.throw(
              Error,
              /schema is invalid/,
            );
          });
        });
      });

      describe('appiumCliAliases', function () {
        let result;

        it('should not allow short aliases for extensions', function () {
          const schema = {
            properties: {
              foo: {type: 'string', appiumCliAliases: ['fooooo', 'F']},
            },
            type: 'object',
          };
          result = getArgs({schema, extName, extType});
          expect(result).to.have.property(
            '--plugin-blob-foo,--plugin-blob-fooooo,--plugin-blob-F',
          );
        });
      });

      describe('appiumCliDescription', function () {
        let result;

        it('should be preferred over `description`', function () {
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
          result = getArgs({schema, extName, extType});
          expect(result['--plugin-blob-foo']).to.have.property('help', 'foo');
        });
      });

      describe('appiumCliTransformer', function () {
        let result;

        it('should use the transformer', function () {
          const schema = {
            properties: {foo: {type: 'string', appiumCliTransformer: 'json'}},
            type: 'object',
          };
          result = getArgs({schema, extName, extType});
          expect(result['--plugin-blob-foo'].type('{"herp": "derp"}')).to.eql({
            herp: 'derp',
          });
        });

        it('should error if the value is not valid for the transformer', function () {
          const schema = {
            properties: {foo: {type: 'string', appiumCliTransformer: 'json'}},
            type: 'object',
          };
          result = getArgs({schema, extName, extType});
          expect(() => result['--plugin-blob-foo'].type('123')).to.throw(
            /must be a valid json/i,
          );
        });

        // this is unlikely to happen, but I want to establish the behavior as defined.
        describe('when used with `enum`', function () {
          describe('and enum members are invalid as per the transformer', function () {
            describe('when provided an enum member', function () {
              it('should throw', function () {
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
                result = getArgs({schema, extName, extType});
                expect(() => result['--plugin-blob-foo'].type('herp')).to.throw(
                  /must be a valid json/i,
                );
              });
            });
          });

          describe('and enum members are valid as per the transformer', function () {
            describe('when provided an enum member', function () {
              it('should return a transformed value', function () {
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
                result = getArgs({schema, extName, extType});
                expect(
                  result['--plugin-blob-foo'].type('{"herp": "derp"}'),
                ).to.eql({herp: 'derp'});
              });
            });

            describe('when not provided an enum member', function () {
              it('should throw', function () {
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
                result = getArgs({schema, extName, extType});
                expect(() =>
                  result['--plugin-blob-foo'].type('{"georgy": "porgy"}'),
                ).to.throw(/one of the allowed values/i);
              });
            });
          });
        });
      });

      describe('enum', function () {
        describe('when used with a non-`string` type', function () {
          it('should throw', function () {
            const schema = {
              properties: {
                foo: {
                  type: 'number',
                  enum: ['herp', 'derp'],
                },
              },
              type: 'object',
            };
            expect(() => getArgs({schema, extName, extType})).to.throw(
              TypeError,
              /`enum` is only supported for `type: 'string'`/i,
            );
          });

          it(
            'should actually throw earlier by failing schema validation, but that would mean overriding the behavior of `enum` which sounds inadvisable',
          );
        });

        describe('when used with a `string` type', function () {
          it('should set `choices` prop', function () {
            const schema = {
              properties: {
                foo: {
                  type: 'string',
                  enum: ['herp', 'derp'],
                },
              },
              type: 'object',
            };
            const result = getArgs({schema, extName, extType});
            expect(result['--plugin-blob-foo']).to.have.deep.property(
              'choices',
              ['herp', 'derp'],
            );
          });
        });
      });
    });
  });
});
