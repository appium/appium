/**
 * This fixture combines the base config schema and the fake-driver schema, as would happen in a real use case.
 */
import {setPath} from '../../lib/object-utils';
import {AppiumConfigJsonSchema} from '@appium/schema';

const {default: fakeDriverSchema} = require('@appium/fake-driver/build/lib/fake-driver-schema');

const schema = structuredClone(AppiumConfigJsonSchema);
setPath(schema as Record<string, unknown>, 'properties.driver.properties.fake', fakeDriverSchema);

export default schema;
