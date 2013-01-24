"""Be sure to use the latest selenium version
as there might be some problems with JSON serialization

Before running the test make sure you started appium server
with UICatalog app: grunt appium:UICatalog

TODO: flick, drag etc.
"""
import unittest
import random
import string
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.touch_actions import TouchActions
from selenium.webdriver.common.keys import Keys
import urllib2
import json

def str_generator(size=6, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))


class TestSequenceFunctions(unittest.TestCase):

    def setUp(self):
        # set up appium
        self.driver = webdriver.Remote(
          command_executor='http://127.0.0.1:4723/wd/hub',
          desired_capabilities={
            'browserName': 'iOS',
            'platform': 'Mac',
            'version': '6.0'
          })
        self._values = []

    def _open_menu_position(self, index):
        # populate text fields with two random number
        table = self.driver.find_element_by_tag_name("tableView")
        self._row = table.find_elements_by_tag_name("tableCell")[index]
        self._row.click()

    def test_find_element(self):
        # first view in UICatalog is a table
        table = self.driver.find_element_by_tag_name("tableView")
        self.assertIsNotNone(table)
        # is number of cells/rows inside table correct
        rows = table.find_elements_by_tag_name("tableCell")
        self.assertEqual(12, len(rows))
        # is first one about buttons
        self.assertEqual(rows[0].text, "Buttons, Various uses of UIButton")
        # navigationBar is not inside table
        nav_bar = table.find_element_by_tag_name("navigationBar")
        self.assertFalse(nav_bar)
        # there is nav bar inside the app
        nav_bar = self.driver.find_element_by_tag_name("navigationBar")
        self.assertTrue(nav_bar)

    # TODO: Needs to be implmented, switching into UIWebView and playing with it
    # def test_frames(self):
    #     pass

    def test_location(self):
        # get third row location
        row = self.driver.find_elements_by_tag_name("tableCell")[2]
        self.assertEqual(row.location['x'], 0)
        self.assertEqual(row.location['y'], 152)

    def test_screenshot(self):
        # make screenshot and get is as base64
        screenshot = self.driver.get_screenshot_as_base64()
        self.assertTrue(screenshot)
        # make screenshot and save it to the local filesystem
        success = self.driver.get_screenshot_as_file("foo.png")
        self.assertTrue(success)

    def test_attributes(self):
        # go to the toolbar section
        self._open_menu_position(9)

        segmented_control = self.driver.find_element_by_tag_name("segmentedControl")
        # segmented_control is enabled by default
        self.assertTrue(segmented_control.is_enabled())
        self.assertTrue(segmented_control.is_displayed())
        # row is from previous view, should not be visible
        self.assertFalse(self._row.is_displayed())

        tinted_switch = self.driver.find_elements_by_tag_name("switch")[1]
        self.assertEqual(tinted_switch.text, "Tinted")
        # check if it is in "off" position
        self.assertEqual(int(tinted_switch.get_attribute("value")), 0)
        tinted_switch.click()
        # check if it is in "on" position
        self.assertEqual(int(tinted_switch.get_attribute("value")), 1)
        # segmented_control should now be disabled
        self.assertFalse(segmented_control.is_enabled())

    def test_text_field_edit(self):
        # go to the text fields section
        self._open_menu_position(2)
        text_field = self.driver.find_elements_by_tag_name("textField")[0]
        # get default/empty text
        default_val = text_field.get_attribute("value")
        # write some random text to element
        rnd_string = str_generator()
        text_field.send_keys(rnd_string)
        self.assertEqual(text_field.get_attribute("value"), rnd_string)
        # send some random keys
        rnd_string2 = str_generator()
        swipe = ActionChains(self.driver).send_keys(rnd_string2)
        swipe.perform()
        # check if text is there
        self.assertEqual(text_field.get_attribute("value"), rnd_string2)
        # clear
        text_field.clear()
        # check if is empty/has default text
        self.assertEqual(text_field.get_attribute("value"), default_val)

    def test_alert_interaction(self):
        # go to the alerts section
        self._open_menu_position(10)
        elements = self.driver.find_elements_by_tag_name("staticText")

        # # TOFIX: Looks like alert object is not proper state
        # triggerOk = elements[2]
        # triggerOk.click()

        # # check if title of alert is correct
        # alert = self.driver.switch_to_alert()
        # self.assertEqual(alert.text, "UIAlertView")
        # # dismiss alert
        # alert.dismiss()

        # trigger modal alert with cancel & ok buttons
        triggerOkCancel = elements[14]
        triggerOkCancel.click()
        alert = self.driver.switch_to_alert()
        # check if title of alert is correct
        self.assertEqual(alert.text, "UIAlertView")
        alert.accept()

    def test_scroll(self):
        # scroll menu
        # get initial third row location
        row = self.driver.find_elements_by_tag_name("tableCell")[2]
        location1 = row.location
        # perform swipe gesture
        swipe = TouchActions(self.driver).flick(0, -20)
        swipe.perform()
        # get new row coordinates
        location2 = row.location
        self.assertEqual(location1['x'], location2['x'])
        self.assertNotEqual(location1['y'], location2['y'])

    def test_slider(self):
        # go to controls
        self._open_menu_position(1)
        # get the slider
        slider = self.driver.find_element_by_tag_name("slider")
        self.assertEqual(slider.get_attribute("value"), "50%")
        drag = TouchActions(self.driver)
        drag.flick_element(slider, -0.5, 0, 0)
        drag.perform()
        self.assertEqual(slider.get_attribute("value"), "0%")

    def test_sessions(self):
        data = json.loads(urllib2.urlopen("http://localhost:4723/wd/hub/sessions").read())
        self.assertEqual(self.driver.session_id, data[0]['id'])

    def test_size(self):
        table = self.driver.find_element_by_tag_name("tableView").size
        row = self.driver.find_elements_by_tag_name("tableCell")[0].size
        self.assertEqual(table['width'], row['width'])
        self.assertNotEqual(table['height'], row['height'])

    def test_source(self):
        # get main view soruce
        source_main = self.driver.page_source
        self.assertIn("UIATableView", source_main)
        self.assertIn("TextFields, Uses of UITextField", source_main)

        # got to text fields section
        self._open_menu_position(2)
        source_textfields = self.driver.page_source
        self.assertIn("UIAStaticText", source_textfields)
        self.assertIn("TextFields", source_textfields)

        self.assertNotEqual(source_main, source_textfields)

    def tearDown(self):
        self.driver.quit()


if __name__ == '__main__':
    unittest.main()
