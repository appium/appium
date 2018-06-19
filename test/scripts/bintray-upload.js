const request = require('request-promise');
const { logger } = require('appium-support');
const path = require('path');
const fs = require('fs');

// Bintray info
const BINTRAY_USERNAME = process.env.BINTRAY_USERNAME;
const BINTRAY_API_KEY = process.env.BINTRAY_API_KEY;
const BINTRAY_REPO = process.env.BINTRAY_REPO || 'appium';
const BINTRAY_SUBJECT = process.env.BINTRAY_SUBJECT || 'appium-builds';
const BINTRAY_PACKAGE = process.env.BINTRAY_PACKAGE || 'appium';
const BINTRAY_URL = `https://bintray.com/api/v1`;

const log = logger.getLogger('Bintray');

(async function () {

  // Version info
  const BUILD_NAME = process.env.TRAVIS_TAG || process.env.TRAVIS_COMMIT || (Math.random() + ""); // The random number is for local, throwaway tests
  const COMMIT_MESSAGE = process.env.TRAVIS_COMMIT_MESSAGE || 'No commit message provided';

  // 1. Create a new 'version' that uses the commit SHA as the name
  log.info(`Creating a new Bintray version: ${BUILD_NAME}`);
  const postVersionUrl = `${BINTRAY_URL}/packages/${BINTRAY_SUBJECT}/${BINTRAY_REPO}/${BINTRAY_PACKAGE}/versions`;
  log.info(`Using Bintray REST API endpoint ${postVersionUrl}`);
  try {
    await request.post(postVersionUrl, {
      body: {
        name: BUILD_NAME,
        desc: COMMIT_MESSAGE,
      },
      json: true,
      auth: {
        user: BINTRAY_USERNAME,
        pass: BINTRAY_API_KEY,
      }
    });
  } catch (e) {
    // 409 means it was created already
    if (e.statusCode !== 409) {
      log.error(`Failed to create new version ${BUILD_NAME}. Reason: ${e.error.message}`);
      process.exit(-1);
    } else {
      log.info(`Version ${BUILD_NAME} was already created. Continuing.`);
    }
  }

  // 2. Upload and publish Appium.zip to Bintray
  log.info(`Uploading 'appium.zip' to bintray at version ${BUILD_NAME}`);
  const uploadZipUrl = `${BINTRAY_URL}/content/${BINTRAY_SUBJECT}/${BINTRAY_REPO}/${BINTRAY_PACKAGE}/${BUILD_NAME}/appium-${BUILD_NAME}.zip?publish=1&override=1`;
  log.info(`Using Bintray REST API upload endpoint ${uploadZipUrl}`);
  try {
    await request.put(uploadZipUrl, {
      formData: {
        file: {
          value: fs.createReadStream(path.resolve(__dirname, '..', '..', '..', 'appium.zip')),
          options: {
            filename: 'appium.zip',
            contentType: 'application/octet-stream',
          },
        },
      },
      auth: {
        user: BINTRAY_USERNAME,
        pass: BINTRAY_API_KEY,
      }
    });
  } catch (e) {
    if (e.statusCode !== 409) {
      // Doesn't fail on 409 because sometimes 409 means that the asset was already published
      // and if that's the case, we don't want it to fail
      log.error(`Didn't publish upload. Upload is already available. Reason:`, e.message);
    } else {
      log.error(`Failed to publish 'appium.zip' to ${BUILD_NAME}. Reason: ${JSON.stringify(e)}`);
      process.exit(-1);
    }
  }
  log.info(`Done publishing 'appium.zip' to ${BUILD_NAME}`);

})();