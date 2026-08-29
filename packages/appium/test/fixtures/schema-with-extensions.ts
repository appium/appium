/**
 * This fixture combines the base config schema and the fake-driver schema, as would happen in a real use case.
 */
import {setPath} from '../../lib/utils/index.js';
import {AppiumConfigJsonSchema} from '@appium/schema';
import fakeDriverSchema from '@appium/fake-driver/build/lib/fake-driver-schema.js';

const schema = structuredClone(AppiumConfigJsonSchema);
setPath(schema as Record<string, unknown>, 'properties.driver.properties.fake', fakeDriverSchema);

export default schema;
