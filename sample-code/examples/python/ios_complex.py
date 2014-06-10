"""
More involved iOS tests, using UICatalog application.
"""
import unittest
import os
import random
import string
from appium import webdriver
from appium.webdriver.common.touch_action import TouchAction
# from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.touch_actions import TouchActions
# from selenium.webdriver.common.keys import Keys
import urllib2
import json
from time import sleep

def str_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))


class ComplexIOSTests(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = os.path.join(os.path.dirname(__file__),
                           '../../apps/UICatalog/build/Release-iphonesimulator',
                           'UICatalog.app')
        app = os.path.abspath(app)
        self.driver = webdriver.Remote(
            command_executor='http://127.0.0.1:4723/wd/hub',
            desired_capabilities={
                'app': app,
                'platformName': 'iOS',
                'platformVersion': '7.1',
                'deviceName': 'iPhone Simulator'
            })
        self._values = []

    def tearDown(self):
        self.driver.quit()

    def _open_menu_position(self, index):
        # Opens up the menu at position [index] : starts at 0.
        table = self.driver.find_element_by_class_name("UIATableView")
        self._row = table.find_elements_by_class_name("UIATableCell")[index]
        self._row.click()

    def test_find_element(self):
        # first view in UICatalog is a table
        table = self.driver.find_element_by_class_name("UIATableView")
        self.assertIsNotNone(table)

        # is number of cells/rows inside table correct
        rows = table.find_elements_by_class_name("UIATableCell")
        self.assertEqual(18, len(rows))

        # is first one about buttons
        self.assertEqual(rows[0].get_attribute("name"), "Action Sheets, AAPLActionSheetViewController")

        # there is nav bar inside the app
        nav_bar = self.driver.find_element_by_class_name("UIANavigationBar")
        self.assertTrue(nav_bar)

    def test_frames(self):
        # go into webview frame
        self._open_menu_position(15)

        # get the contexts and switch to webview
        contexts = self.driver.contexts
        self.assertEqual([u'NATIVE_APP', u'WEBVIEW_1'], contexts)
        self.driver.switch_to.context(contexts[1])

        # Find the store link
        sleep(4) # let the page load, perhaps
        logo = self.driver.find_element_by_id('gn-apple')
        self.assertIsNotNone(logo)

        # leave the webview
        self.driver.switch_to.context(contexts[0])

        # Verify we are out of the webview
        scroll_after = self.driver.find_element_by_class_name("UIAScrollView")
        self.assertTrue(scroll_after)

    def test_location(self):
        # get third row location
        row = self.driver.find_elements_by_class_name("UIATableCell")[2]
        self.assertEqual(row.location['x'], 0)
        self.assertEqual(row.location['y'], 152)

    def test_screenshot(self):
        # make screenshot and get is as base64
        screenshot = self.driver.get_screenshot_as_base64()
        self.assertTrue(screenshot)

        # make screenshot and save it to the local filesystem
        success = self.driver.get_screenshot_as_file("foo.png")
        self.assertTrue(success)
        self.assertTrue(os.path.isfile("foo.png"))

        # get rid of the file
        os.remove("foo.png")

    def test_text_field_edit(self):
        # go to the text fields section
        self._open_menu_position(13)

        text_field = self.driver.find_elements_by_class_name("UIATextField")[0]

        # get default/empty text
        default_val = text_field.get_attribute("value")

        # write some random text to element
        rnd_string = str_generator()
        text_field.send_keys(rnd_string)
        self.assertEqual(text_field.get_attribute("value"), rnd_string)

        # clear and check if is empty/has default text
        text_field.clear()
        self.assertEqual(text_field.get_attribute("value"), default_val)

    def test_alert_interaction(self):
        # go to the alerts section
        self.driver.find_element_by_name('Alert Views, AAPLAlertViewController').click()
        triggerOk = self.driver.find_element_by_accessibility_id("Simple")

        # TOFIX: Looks like alert object is not proper state
        # something to do with UIActionSheet vs. UIAlertView?
        # triggerOk = elements[0]
        triggerOk.click()
        alert = self.driver.switch_to_alert()

        # dismiss alert
        alert.accept()

        # trigger modal alert with cancel & ok buttons
        triggerOkCancel = self.driver.find_element_by_accessibility_id("Okay / Cancel")
        triggerOkCancel.click()
        alert = self.driver.switch_to_alert()

        # check if title of alert is correct
        self.assertEqual(alert.text, "A Short Title Is Best A message should be a short, complete sentence.")
        alert.accept()

    def test_slider(self):
        # go to controls
        self._open_menu_position(10)

        # get the slider
        slider = self.driver.find_element_by_class_name("UIASlider")
        self.assertEqual(slider.get_attribute("value"), "42%")

        slider.set_value(0)
        self.assertEqual(slider.get_attribute("value"), "0%")

    def test_sessions(self):
        data = json.loads(urllib2.urlopen("http://localhost:4723/wd/hub/sessions").read())
        self.assertEqual(self.driver.session_id, data['sessionId'])

    def test_size(self):
        table = self.driver.find_element_by_class_name("UIATableView").size
        row = self.driver.find_elements_by_class_name("UIATableCell")[0].size
        self.assertEqual(table['width'], row['width'])
        self.assertNotEqual(table['height'], row['height'])

    def test_source(self):
        # get main view soruce
        source_main = self.driver.page_source
        self.assertIn("UIATableView", source_main)
        self.assertIn("Text Fields, AAPLTextFieldViewController", source_main)

        # got to text fields section
        self._open_menu_position(13)
        sleep(10)
        source_textfields = self.driver.page_source
        self.assertIn("UIAStaticText", source_textfields)
        self.assertIn("Text Fields", source_textfields)

        self.assertNotEqual(source_main, source_textfields)


suite = unittest.TestLoader().loadTestsFromTestCase(ComplexIOSTests)
unittest.TextTestRunner(verbosity=2).run(suite)
