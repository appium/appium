import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_logcat, ANDROID_APP_PATH, EXECUTOR


class TestAndroidBasicInteractions():

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities={
                'app': ANDROID_APP_PATH,
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android'
            }
        )

        def fin():
            take_screenhot_and_logcat(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_find_elements_by_accessibility_id(self, driver):
        search_parameters_element = driver.find_elements_by_accessibility_id('Content')
        assert 1 == len(search_parameters_element)

    def test_should_find_elements_by_id(self, driver):
        action_bar_container_elements = driver.find_elements_by_id('android:id/action_bar_container')
        assert 1 == len(action_bar_container_elements)

    def test_should_find_elements_by_class_name(self, driver):
        action_bar_container_elements = driver.find_elements_by_class_name('android.widget.FrameLayout')
        assert 3 == len(action_bar_container_elements)

    def test_should_find_elements_by_xpath(self, driver):
        action_bar_container_elements = driver.find_elements_by_xpath('//*[@class="android.widget.FrameLayout"]')
        assert 3 == len(action_bar_container_elements)
