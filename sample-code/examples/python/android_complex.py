import os
import unittest

from appium import webdriver
from appium.webdriver.common.touch_action import TouchAction
from appium.webdriver.common.multi_action import MultiAction

from time import sleep

# Returns abs path relative to this file and not cwd
PATH = lambda p: os.path.abspath(
    os.path.join(os.path.dirname(__file__), p)
)

class ComplexAndroidTests(unittest.TestCase):
    def setUp(self):
        desired_caps = {}
        desired_caps['platformName'] = 'Android'
        desired_caps['platformVersion'] = '4.2'
        desired_caps['deviceName'] = 'Android Emulator'
        desired_caps['app'] = PATH(
            '../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk'
        )

        self.driver = webdriver.Remote('http://localhost:4723/wd/hub', desired_caps)

    def tearDown(self):
        self.driver.quit()

    def test_find_elements(self):
        # pause a moment, so xml generation can occur
        sleep(2)

        els = self.driver.find_elements_by_xpath('//android.widget.TextView')
        self.assertEqual('API Demos', els[0].text)

        el = self.driver.find_element_by_xpath('//android.widget.TextView[contains(@text, "Animat")]')
        self.assertEqual('Animation', el.text)

        el = self.driver.find_element_by_accessibility_id("App")
        el.click()

        els = self.driver.find_elements_by_android_uiautomator('new UiSelector().clickable(true)')
        # there are more, but at least 10 visible
        self.assertLess(10, len(els))
        # the list includes 2 before the main visible elements
        self.assertEqual('Action Bar', els[2].text)

        els = self.driver.find_elements_by_xpath('//android.widget.TextView')
        self.assertLess(10, len(els))
        self.assertEqual('Action Bar', els[1].text)

    def test_scroll(self):
        sleep(2)
        els = self.driver.find_elements_by_xpath('//android.widget.TextView')
        self.driver.scroll(els[7], els[3])

        el = self.driver.find_element_by_accessibility_id('Views')

    def test_smiley_face(self):
        # just for the fun of it.
        # this doesn't really assert anything.
        self.driver.find_element_by_accessibility_id('Graphics').click()

        els = self.driver.find_elements_by_class_name('android.widget.TextView')
        self.driver.scroll(els[len(els)-1], els[0])

        el = None
        try:
            el = self.driver.find_element_by_accessibility_id('Touch Paint')
        except Exception as e:
            els = self.driver.find_elements_by_class_name('android.widget.TextView')
            self.driver.scroll(els[len(els)-1], els[0])

        if el is None:
            el = self.driver.find_element_by_accessibility_id('Touch Paint')

        el.click()

        # paint
        e1 = TouchAction()
        e1.press(x=150, y=100).release()

        e2 = TouchAction()
        e2.press(x=250, y=100).release()

        smile = TouchAction()
        smile.press(x=110, y=200) \
            .move_to(x=1, y=1) \
            .move_to(x=1, y=1) \
            .move_to(x=1, y=1) \
            .move_to(x=1, y=1) \
            .move_to(x=1, y=1) \
            .move_to(x=2, y=1) \
            .move_to(x=2, y=1) \
            .move_to(x=2, y=1) \
            .move_to(x=2, y=1) \
            .move_to(x=2, y=1) \
            .move_to(x=3, y=1) \
            .move_to(x=3, y=1) \
            .move_to(x=3, y=1) \
            .move_to(x=3, y=1) \
            .move_to(x=3, y=1) \
            .move_to(x=4, y=1) \
            .move_to(x=4, y=1) \
            .move_to(x=4, y=1) \
            .move_to(x=4, y=1) \
            .move_to(x=4, y=1) \
            .move_to(x=5, y=1) \
            .move_to(x=5, y=1) \
            .move_to(x=5, y=1) \
            .move_to(x=5, y=1) \
            .move_to(x=5, y=1) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=0) \
            .move_to(x=5, y=-1) \
            .move_to(x=5, y=-1) \
            .move_to(x=5, y=-1) \
            .move_to(x=5, y=-1) \
            .move_to(x=5, y=-1) \
            .move_to(x=4, y=-1) \
            .move_to(x=4, y=-1) \
            .move_to(x=4, y=-1) \
            .move_to(x=4, y=-1) \
            .move_to(x=4, y=-1) \
            .move_to(x=3, y=-1) \
            .move_to(x=3, y=-1) \
            .move_to(x=3, y=-1) \
            .move_to(x=3, y=-1) \
            .move_to(x=3, y=-1) \
            .move_to(x=2, y=-1) \
            .move_to(x=2, y=-1) \
            .move_to(x=2, y=-1) \
            .move_to(x=2, y=-1) \
            .move_to(x=2, y=-1) \
            .move_to(x=1, y=-1) \
            .move_to(x=1, y=-1) \
            .move_to(x=1, y=-1) \
            .move_to(x=1, y=-1) \
            .move_to(x=1, y=-1)
        smile.release()

        ma = MultiAction(self.driver)
        ma.add(e1, e2, smile)
        ma.perform()

        # so you can see it
        sleep(10)


if __name__ == '__main__':
    suite = unittest.TestLoader().loadTestsFromTestCase(ComplexAndroidTests)
    unittest.TextTestRunner(verbosity=2).run(suite)
