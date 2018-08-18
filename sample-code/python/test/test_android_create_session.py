import unittest
import os

from appium import webdriver

# Run standard unittest base.
class TestAndroidSelectors(unittest.TestCase):
    APP_PATH = 'http://appium.github.io/appium/assets/ApiDemos-debug.apk' if os.getenv(
        'SAUCE_LABS') else os.path.abspath('../apps/ApiDemos-debug.apk')

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = "http://%s:%s@ondemand.saucelabs.com:80/wd/hub" % (
            os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    def setUp(self):
        self.driver = webdriver.Remote(
            command_executor=self.EXECUTOR,
            desired_capabilities={
                'app': self.APP_PATH,
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android',
            }
        )
        self.driver.implicitly_wait(10)

    def test_should_create_and_destroy_android_session(self):
        activity = self.driver.current_activity
        pkg = self.driver.current_package

        assert 'io.appium.android.apis.ApiDemos' == pkg + activity
        self.driver.quit()
