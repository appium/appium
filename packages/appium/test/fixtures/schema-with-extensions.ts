/**
 * This fixture combines the base config schema and the fake-driver schema, as would happen in a real use case.
 */
import _ from 'lodash';
import {AppiumConfigJsonSchema} from '@appium/schema';

const {default: fakeDriverSchema} = require('@appium/fake-driver/build/lib/fake-driver-schema');

const schema = _.cloneDeep(AppiumConfigJsonSchema);
_.set(schema, 'properties.driver.properties.fake', fakeDriverSchema);

export default schema;
