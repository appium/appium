import os
import time
from selenium import webdriver

# Returns abs path relative to this file and not cwd
PATH = lambda p: os.path.abspath(
    os.path.join(os.path.dirname(__file__), p)
)

# think times can be useful e.g. when testing with an emulator
THINK_TIME = 5.

desired_caps = {}
desired_caps['device'] = 'selendroid'
desired_caps['browserName'] = ''
desired_caps['version'] = '4.3'
desired_caps['app'] = PATH('../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk')
desired_caps['app-package'] = 'com.example.android.apis'
desired_caps['app-activity'] = '.ApiDemos'

driver = webdriver.Remote('http://localhost:4723/wd/hub', desired_caps)

el = driver.find_element_by_partial_link_text("Animat")
assert el.text == "Animation"

el = driver.find_element_by_class_name("android.widget.TextView")
assert el.text == "Accessibility"

el = driver.find_element_by_link_text("App")
el.click()
time.sleep(THINK_TIME)

els = driver.find_elements_by_class_name("android.widget.TextView")
assert els[1].text == "Activity"

driver.back()
time.sleep(THINK_TIME)

el = driver.find_element_by_link_text("Animation")
flick = webdriver.TouchActions(driver).flick_element(el, 0, -100, 0)
flick.perform()

el = driver.find_element_by_link_text("Views")
el.click()
time.sleep(THINK_TIME)

driver.quit()
