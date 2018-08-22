import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_logcat, EXECUTOR
from selenium.common.exceptions import InvalidSessionIdException


class TestAndroidCreateWebSession():

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities={
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android',
                'browserName': 'Chrome'
            }
        )

        def fin():
            take_screenhot_and_logcat(driver, device_logger, calling_request)

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_create_and_destroy_android_session(self, driver):
        driver.get('https://www.google.com')
        title = driver.title

        assert 'Google' == title

        with pytest.raises(InvalidSessionIdException) as excinfo:
            driver.title
        assert 'A session is either terminated or not started' == excinfo.value.msg
