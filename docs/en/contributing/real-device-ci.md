# Real Device Continuous Integration

Appium uses a service called [TestObject](https://testobject.com/) that allows us to run automated functional tests against real devices.

## How it works

* See [here](https://help.testobject.com/docs/tools/appium/reference/) for details on how TestObject runs Appium tests
* For tests that use [wd](https://github.com/admc/wd), to run TestObject tests we must use a method called `enableTestObject` from `appium-test-support` which is called before the tests are run
* This method does the following:
  * Pulls down appium and runs git command from the shell to clone it
  * Rewrites it and changes the version of the driver we want to test to point to a git URL with a commit hash
  * Installs the npm modules
  * Zips the folder
  * Uploads it to S3
  * Overrides wd so that it includes testobject specific desired capabilities including a path to the S3 url

## Environment

* In order to use this you need to set some environment variables
  * AWS_ACCESS_KEY_ID: ID with S3 write access
  * AWS_SECRET_ACCESS_KEY
  * AWS_REGION
  * AWS_S3_BUCKET: Name of the bucket being written to
  * TESTOBJECT_API_KEY

## Example

```javascript
// This script, if run before the rest of the tests, will use TestObject appium staging server
import { enableTestObject, disableTestObject } from 'appium-test-support';
import wd from 'wd';
import { startServer, DEFAULT_PORT } from '../../..';
import logger from '../../../lib/logger';

if (process.env.TESTOBJECT_E2E_TESTS) {
  logger.debug('Running tests on TestObject');

  let wdObject;
  before(async function () {
    // Use a commit SHA as the git branch
    const branch = process.env.COMMIT_HASH || process.env.TRAVIS_COMMIT;
    if (!branch) {
      throw new Error(`A commit must be provided in $COMMIT_HASH`);
    }
    // Uploads the zip and injects 'appium-uiautomator2-driver' as the branch
    wdObject = await enableTestObject(wd, 'appium-uiautomator2-driver', `git@github.com:appium/appium-uiautomator2-driver.git#${branch}`);
  });
  after(async function () {
    // Reverses the overriding of 'wd'
    await disableTestObject(wdObject);
  });

} else {
  before(async function () {
    // If we're not using TestObject, we're using a local server
    await startServer(DEFAULT_PORT, 'localhost');
  });
}

```