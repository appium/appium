import pytest
import os

from appium import webdriver

class TestAndroidSelectors():
    APP_PATH = 'http://appium.github.io/appium/assets/ApiDemos-debug.apk' if os.getenv('SAUCE_LABS') else os.path.abspath('../apps/ApiDemos-debug.apk')

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = "http://%s:%s@ondemand.saucelabs.com:80/wd/hub" % (os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    @pytest.fixture(scope="function")
    def driver(self, request, device_logger):
        driver = webdriver.Remote(
            command_executor = self.EXECUTOR,
            desired_capabilities = {
                'app': self.APP_PATH,
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android',
            }
        )
        driver.implicitly_wait(10)

        return driver

    def test_should_create_and_destroy_android_session(self, driver):
        activity = driver.current_activity
        pkg = driver.current_package

        assert 'io.appium.android.apis.ApiDemos' == pkg + activity
        driver.quit()
