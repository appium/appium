import os
import httplib
import base64
try:
    import json
except ImportError:
    import simplejson as json

import unittest

from appium import webdriver

SAUCE_USERNAME = os.environ.get('SAUCE_USERNAME')
SAUCE_ACCESS_KEY = os.environ.get('SAUCE_ACCESS_KEY')
base64string = base64.encodestring('%s:%s' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY))[:-1]

class SimpleAndroidSauceTests(unittest.TestCase):

    def setUp(self):
        # set up appium
        app = "http://appium.s3.amazonaws.com/NotesList.apk"
        self.driver = webdriver.Remote(
            command_executor='http://%s:%s@ondemand.saucelabs.com:80/wd/hub' % (SAUCE_USERNAME, SAUCE_ACCESS_KEY),
            desired_capabilities={
                'appium-version': '1.0.0-beta.2',
                'platformName': 'Android',
                'deviceName': 'Android Emulator',
                'platformVersion': '4.2',
                'app': app,
                'name': 'Appium Python Android Test',
                'appPackage': 'com.example.android.notepad',
                'appActivity': '.NotesList'
            })

    def tearDown(self):
        print("Link to your job: https://saucelabs.com/jobs/%s" % self.driver.session_id)
        self.driver.quit()

    def _set_test_status(self, jobid, passed=True):
        # Report the status of your test to Sauce
        body_content = json.dumps({"passed": passed})
        connection = httplib.HTTPConnection("saucelabs.com")
        connection.request('PUT', '/rest/v1/%s/jobs/%s' % (SAUCE_USERNAME, jobid),
                           body_content,
                           headers={"Authorization": "Basic %s" % base64string})
        result = connection.getresponse()
        return result.status == 200

    def test_create_note(self):
        el = self.driver.find_element_by_name("New note")
        el.click()

        el = self.driver.find_element_by_class_name("android.widget.EditText")
        el.send_keys("This is a new note!")

        el = self.driver.find_element_by_name("Save")
        el.click()

        els = self.driver.find_elements_by_class_name("android.widget.TextView")
        try:
            self.assertEqual(els[2].text, "This is a new note!")
            self._set_test_status(self.driver.session_id, True)
        except:
            self._set_test_status(self.driver.session_id, False)

        els[2].click()


if __name__ == '__main__':
    if not (SAUCE_USERNAME and SAUCE_ACCESS_KEY):
        print "Make sure you have SAUCE_USERNAME and SAUCE_ACCESS_KEY set as environment variables."
    else:
        unittest.main()
