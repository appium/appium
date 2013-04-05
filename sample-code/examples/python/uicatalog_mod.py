"""Be sure to use the latest selenium version
as there might be some problems with JSON serialization

Before running the test make sure you started appium server
with UICatalog app: grunt appium:UICatalog

TODO: flick, drag etc.
"""
import unittest
import os
import random
import string
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.touch_actions import TouchActions
from selenium.webdriver.common.keys import Keys
import urllib2
import json

class TestSequenceFunctions(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = os.path.join(os.path.dirname(__file__),
                           '../../apps/UICatalog/build/Release-iphonesimulator',
                           'UICatalog.app')
        app = os.path.abspath(app)
        self.driver = webdriver.Remote(
            command_executor='http://127.0.0.1:4723/wd/hub',
            desired_capabilities={
                'browserName': 'iOS',
                'platform': 'Mac',
                'version': '6.0',
                'app': app
            })
        self._values = []

    def _open_menu_position(self, index):
        # populate text fields with two random number
        table = self.driver.find_element_by_tag_name("tableView")
        self._row = table.find_elements_by_tag_name("tableCell")[index-1]
        self._row.click()
        print index
        

    def test_find_element(self):
        # first view in UICatalog is a table
        table = self.driver.find_element_by_tag_name("tableView")
        self.assertIsNotNone(table)
        # is number of cells/rows inside table correct
        rows = table.find_elements_by_tag_name("tableCell")
        self.assertEqual(12, len(rows))
        # there is nav bar inside the app
        nav_bar = self.driver.find_element_by_tag_name("navigationBar")
        self.assertTrue(nav_bar)
        source_main = self.driver.page_source
        self._open_menu_position(8)
        handle = self.driver.window_handles[0]
        print "start switching"
        self.driver.switch_to_window(handle)
        print "end switching"
        source_web = self.driver.page_source
        self.driver.execute_script("mobile: leaveWebView")
        
        

    def tearDown(self):
        self.driver.quit()


if __name__ == '__main__':
    unittest.main()