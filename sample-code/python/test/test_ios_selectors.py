import pytest
import os

from appium import webdriver
from helpers import take_screenhot_and_syslog


class TestIOSBasicInteractions():
    APP_PATH = 'http://appium.github.io/appium/assets/TestApp7.1.app.zip' if os.getenv(
        'SAUCE_LABS') else os.path.abspath('../apps/TestApp.app.zip')

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = 'http://{}:{}@ondemand.saucelabs.com:80/wd/hub'.format(
            os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name
        driver = webdriver.Remote(
            command_executor=self.EXECUTOR,
            desired_capabilities={
                'app': self.APP_PATH,
                'platformName': 'iOS',
                'automationName': 'XCUITest',
                'platformVersion': os.getenv('IOS_PLATFORM_VERSION') or '11.1',
                'deviceName': os.getenv('IOS_DEVICE_NAME') or 'iPhone 6s',
            }
        )

        def fin():
            take_screenhot_and_syslog(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_find_elements_by_accessibility_id(self, driver):
        search_parameters_element = driver.find_elements_by_accessibility_id('ComputeSumButton')
        assert 1 == len(search_parameters_element)
        search_parameters_element[0].click()

    def test_should_find_elements_by_class_name(self, driver):
        window_elements = driver.find_elements_by_class_name('XCUIElementTypeWindow')
        assert 1 < len(window_elements)

    def test_should_find_elements_by_nspredicate(self, driver):
        all_visible_elements = driver.find_elements_by_ios_predicate('visible = 1')
        assert 1 < len(all_visible_elements)

    def test_should_find_elements_by_class_chain(self, driver):
        window_element = driver.find_elements_by_ios_class_chain('XCUIElementTypeWindow[1]/*[2]')
        assert 1 == len(window_element)

    def test_should_find_elements_by_xpath(self, driver):
        action_bar_container_elements = driver.find_elements_by_xpath('//XCUIElementTypeWindow//XCUIElementTypeButton')
        assert 1 < len(action_bar_container_elements)
