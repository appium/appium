import { BaseDriver } from 'appium-base-driver';
import { routeConfiguringFunction } from 'mobile-json-wire-protocol';

class AppiumDriver extends BaseDriver {

  async getStatus () {
    return {};
  }
}

function getAppiumRouter (args) {
  let appium = new AppiumDriver(args);
  return routeConfiguringFunction(appium);
}

export { AppiumDriver, getAppiumRouter };
