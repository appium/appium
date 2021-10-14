// this fixture combines the base config schema and the fake-driver schema, as would happen in a real use case.
import _ from 'lodash';
import appiumConfigSchema from '../../lib/schema/appium-config-schema';

// this must be a `require` because babel will not compile `node_modules`
// TOOD: consider just copying this into fixtures so we can make it ESM
const {default: fakeDriverSchema} = require('@appium/fake-driver/build/lib/fake-driver-schema');

const schema = _.cloneDeep(appiumConfigSchema);
_.set(schema, 'properties.driver.properties.fake', fakeDriverSchema);

export default schema;
