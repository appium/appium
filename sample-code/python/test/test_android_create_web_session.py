import pytest
import os

from appium import webdriver

class TestAndroidCreateWebSession():

    if os.getenv('SAUCE_USERNAME') and os.getenv('SAUCE_ACCESS_KEY'):
        EXECUTOR = "http://%s:%s@ondemand.saucelabs.com:80/wd/hub" % (os.getenv('SAUCE_USERNAME'), os.getenv('SAUCE_ACCESS_KEY'))
    else:
        EXECUTOR = 'http://127.0.0.1:4723/wd/hub'

    @pytest.fixture(scope="function")
    def driver(self, request, device_logger):
        driver = webdriver.Remote(
            command_executor = self.EXECUTOR,
            desired_capabilities = {
                'platformName': 'Android',
                'automationName': 'UIAutomator2',
                'platformVersion': os.getenv('ANDROID_PLATFORM_VERSION') or '7.1',
                'deviceName': os.getenv('ANDROID_DEVICE_VERSION') or 'Android',
                'browserName': 'Chrome'
            }
        )
        driver.implicitly_wait(10)

        return driver

    def test_should_create_and_destroy_android_session(self, driver):
        driver.get('https://www.google.com')
        title = driver.title

        assert 'Google' == title
        driver.quit()
