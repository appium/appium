import {BaseDriver} from '@appium/base-driver';
import type {CapabilitySchema, Driver, InitialOpts, SchemaConstraints} from '@appium/types';
import {expectAssignable, expectError, expectType} from 'tsd';

const schema = {
  type: 'object',
  properties: {
    count: {type: 'integer'},
    enabled: {type: 'boolean'},
    mode: {type: 'string', enum: ['safe', 'fast']},
    complex: {$ref: '#/definitions/complex'},
  },
  definitions: {complex: {type: 'array', items: {type: 'integer'}}},
} as const satisfies CapabilitySchema;

class SchemaDriver extends BaseDriver<SchemaConstraints<typeof schema>> {
  readonly desiredCapSchema = schema;
}

const driver = new SchemaDriver({} as InitialOpts);
expectAssignable<Driver<SchemaConstraints<typeof schema>>>(driver);
expectType<number | undefined>(driver.caps.count);
expectType<boolean | undefined>(driver.opts.enabled);
expectType<'safe' | 'fast' | undefined>(driver.caps.mode);
expectType<unknown>(driver.caps.complex);
expectError((driver.caps.count = '1'));
expectError((driver.caps.enabled = 'true'));
expectError((driver.caps.mode = 'invalid'));
