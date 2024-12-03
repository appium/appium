import {logger} from '@appium/support';

const log = logger.getLogger('Doctor CLI');
const DEV_DOC_URL = 'https://github.com/appium/appium/blob/master/packages/appium/docs/en/developing/build-doctor-checks.md';

async function main() {
  log.warn(`The Appium server's 'doctor' CLI utility has been removed`);
  log.warn(
    `Please use the 'doctor' script defined for the specific driver or plugin, ` +
    `for example 'appium driver doctor uiautomator2'`
  );
  log.info(`Check ${DEV_DOC_URL} if you would like to contribute to existing doctor checks`);
  process.exit(1);
}

(async () => await main())();
