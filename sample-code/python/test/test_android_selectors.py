import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_logcat

class TestAndroidBasicInteractions():
    APP_PATH = 'http://appium.github.io/appium/assets/ApiDemos-debug.apk' if os.getenv('SAUCE_LABS') else os.path.abspath('../apps/ApiDemos-debug.apk')

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = "http://%s:%s@ondemand.saucelabs.com:80/wd/hub" % (os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    @pytest.fixture(scope="function")
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor = self.EXECUTOR,
            desired_capabilities = {
                'app': self.APP_PATH,
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android'
            }
        )
        driver.implicitly_wait(10)

        def fin():
            take_screenhot_and_logcat(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)
        return driver

    def test_should_find_elements_by_accessibility_id(self, driver):
        search_parameters_element = driver.find_elements_by_accessibility_id('Content')
        assert 1 == len(search_parameters_element)

    def test_should_find_elements_by_id(self, driver):
        action_bar_container_elements = driver.find_elements_by_id('android:id/action_bar_container')
        assert 1 == len(action_bar_container_elements)

    def test_should_find_elements_by_class_name(self, driver):
        action_bar_container_elements = driver.find_elements_by_class_name('android.widget.FrameLayout')
        assert 1 < len(action_bar_container_elements)

    def test_should_find_elements_by_xpath(self, driver):
        action_bar_container_elements = driver.find_elements_by_xpath('//*[@class="android.widget.FrameLayout"]')
        assert 1 < len(action_bar_container_elements)
