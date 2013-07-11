import os
from selenium import webdriver

# Returns abs path relative to this file and not cwd
PATH = lambda p: os.path.abspath(
    os.path.join(os.path.dirname(__file__), p)
)

desired_caps = {}
desired_caps['device'] = 'Android'
desired_caps['browserName'] = ''
desired_caps['version'] = '4.2'
desired_caps['app'] = PATH('../../../sample-code/apps/ContactManager/ContactManager.apk')
desired_caps['app-package'] = 'com.example.android.contactmanager'
desired_caps['app-activity'] = '.ContactManager'

driver = webdriver.Remote('http://localhost:4723/wd/hub', desired_caps)

el = driver.find_element_by_name("Add Contact")
el.click()

textfields = driver.find_elements_by_tag_name("textfield")
textfields[0].send_keys("My Name")
textfields[2].send_keys("someone@somewhere.com")

driver.find_element_by_name("Save").click()

driver.quit()
