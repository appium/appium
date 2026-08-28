/**
 * This fixture combines the base config schema and the fake-driver schema, as would happen in a real use case.
 */
import {setPath} from '../../lib/utils/index.js';
import {AppiumConfigJsonSchema} from '@appium/schema';
import fakeDriverSchemaPkg from '@appium/fake-driver/build/lib/fake-driver-schema.js';

// `fake-driver` is still CJS (not yet converted), so its compiled `export default` shows up
// as a `.default` property on the whole `module.exports` object under ESM interop.
const fakeDriverSchema = (
  'default' in fakeDriverSchemaPkg
    ? (fakeDriverSchemaPkg as unknown as {default: typeof fakeDriverSchemaPkg}).default
    : fakeDriverSchemaPkg
) as typeof fakeDriverSchemaPkg;

const schema = structuredClone(AppiumConfigJsonSchema);
setPath(schema as Record<string, unknown>, 'properties.driver.properties.fake', fakeDriverSchema);

export default schema;
