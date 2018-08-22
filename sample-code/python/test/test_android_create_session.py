import unittest
import os

from appium import webdriver
from helpers import take_screenhot_and_logcat, ANDROID_APP_PATH, EXECUTOR
from selenium.common.exceptions import InvalidSessionIdException

# Run standard unittest base.


class TestAndroidSelectors(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities={
                'app': ANDROID_APP_PATH,
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

        self.assertEquals('io.appium.android.apis.ApiDemos', '{}{}'.format(pkg, activity))
        self.driver.quit()

        with self.assertRaises(InvalidSessionIdException) as excinfo:
            self.driver.title
        self.assertEquals('A session is either terminated or not started', excinfo.exception.msg)
