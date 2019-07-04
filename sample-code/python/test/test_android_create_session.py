import unittest
import os
import copy
import sys

from time import sleep

from appium import webdriver
from helpers import report_to_sauce, ANDROID_BASE_CAPS, EXECUTOR
from selenium.common.exceptions import WebDriverException

# Run standard unittest base.


class TestAndroidCreateSession(unittest.TestCase):
    def tearDown(self):
        report_to_sauce(self.driver.session_id)

    def test_should_create_and_destroy_android_session(self):
        caps = copy.copy(ANDROID_BASE_CAPS)
        caps['name'] = 'test_should_create_and_destroy_android_session'

        self.driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities=caps
        )
        self.driver.implicitly_wait(10)

        # make sure the right package and activity were started
        self.assertEquals('io.appium.android.apis', self.driver.current_package)
        self.assertEquals('.ApiDemos', self.driver.current_activity)

        self.driver.quit()

        sleep(5)

        # should not be able to use the driver anymore
        with self.assertRaises(WebDriverException) as excinfo:
            self.driver.title
        self.assertTrue('has already finished' in str(excinfo.exception.msg))
