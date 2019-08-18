import pytest
import os
import copy

from appium import webdriver
from helpers import report_to_sauce, take_screenshot_and_syslog, IOS_BASE_CAPS, EXECUTOR


class TestIOSSelectors():

    @pytest.fixture(scope='function')
    def driver(self, request, device_logger):
        calling_request = request._pyfuncitem.name

        caps = copy.copy(IOS_BASE_CAPS)
        caps['name'] = calling_request

        driver = webdriver.Remote(
            command_executor=EXECUTOR,
            desired_capabilities=caps
        )

        def fin():
            report_to_sauce(driver.session_id)
            take_screenshot_and_syslog(driver, device_logger, calling_request)
            driver.quit()

        request.addfinalizer(fin)

        driver.implicitly_wait(10)
        return driver

    def test_should_find_elements_by_accessibility_id(self, driver):
        search_parameters_element = driver.find_elements_by_accessibility_id('ComputeSumButton')
        assert 1 == len(search_parameters_element)

    def test_should_find_elements_by_class_name(self, driver):
        window_elements = driver.find_elements_by_class_name('XCUIElementTypeWindow')
        assert 2 == len(window_elements)

    def test_should_find_elements_by_nspredicate(self, driver):
        all_visible_elements = driver.find_elements_by_ios_predicate('visible = 1')
        assert 24 <= len(all_visible_elements)

    def test_should_find_elements_by_class_chain(self, driver):
        window_element = driver.find_elements_by_ios_class_chain('XCUIElementTypeWindow[1]/*')
        assert 1 == len(window_element)

    def test_should_find_elements_by_xpath(self, driver):
        action_bar_container_elements = driver.find_elements_by_xpath('//XCUIElementTypeWindow//XCUIElementTypeButton')
        assert 8 == len(action_bar_container_elements)
