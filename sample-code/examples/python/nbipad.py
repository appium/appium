"""Be sure to use the latest selenium version
as there might be some problems with JSON serialization

Before running the test make sure you started appium server
with UICatalog app: grunt appium:UICatalog

TODO: flick, drag etc.
"""
import unittest
import os
import string
import time
# from command import Command
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
                           '../../../../Library/Developer/Xcode/DerivedData/Notebook_Express-ciornavldjbnuvgbivobsanormur/Build/Products/Debug-iphonesimulator/',
                           'Notebook.app')
        app = os.path.abspath(app)
        self.driver = webdriver.Remote(
            command_executor='http://127.0.0.1:4723/wd/hub',
            desired_capabilities={
                'browserName': 'iOS',
                'platform': 'Mac',
                'version': '6.1',
                'app': app
            })
        self._values = []

#     def test_find_element(self):
#         # first view in NB Ipad is a navigationBar
#         navBar = self.driver.find_element_by_tag_name("navigationBar")
#         self.assertIsNotNone(navBar)
#         # second view in NB iPad is a scrollview
#         scroll = self.driver.find_element_by_tag_name("scrollview")
#         self.assertIsNotNone(scroll)
#         # is number of buttons inside navbar correct
#         buttons = navBar.find_elements_by_tag_name("button")
#         self.assertEqual(4, len(buttons))
#         # is this first text element in the Scroll View Create File
#         text = scroll.find_elements_by_tag_name("text")
#         self.assertEqual(text[0].text, "Create File")
# 
#     def test_create_file(self):
#         # click on the Create file
#         scroll = self.driver.find_element_by_tag_name("scrollview")
#         text = scroll.find_elements_by_tag_name("text")[0]
#         text.click()
#         
# 		# the new page contains a webview
#         webview = self.driver.find_elements_by_tag_name("webview")
#         self.assertIsNotNone(webview)
#         
#         #I can click on the toolbar
#         toolbar = self.driver.find_element_by_tag_name("toolbar")
#         shape_tool = toolbar.find_element_by_name("NBEX shape")
#         shape_tool.click()
#         
#         #I can see the shape I have just created
#         navBar = self.driver.find_element_by_tag_name("navigationBar")
#         navBar.find_element_by_name("SMART Notebook Content").click()
#         
#     def test_open_tutorial(self):
#         # click on the Create file
#         scroll = self.driver.find_element_by_tag_name("scrollview")
#         tutorial = scroll.find_elements_by_tag_name("button")[4]
#         tutorial.click()
#         
# 		# the new page contains a webview
#         webview = self.driver.find_elements_by_tag_name("webview")
#         handle = self.driver.window_handles
#         self.driver.switch_to_window(handle[0])
#         test = self.driver.execute_script('{ var test = "test"; return test;}')
#         self.assertEqual(test, "nottest")
# #         self.driver.execute_script("mobile: leaveWebView")
# #         
# #         navBar = self.driver.find_element_by_tag_name("navigationBar")
# #         navBar.find_element_by_name("SMART Notebook Content").click()
#         
#         
# #         text = self.driver.find_element_by_text('test')
# #         self.assertIsNotNone(text)
# # 
#     def test_click_response(self):
#         # click on the response button in the Navbar
#         navBar = self.driver.find_element_by_tag_name("navigationBar")
#         resp = navBar.find_elements_by_tag_name("button")[1]
#         resp.click()
#     	resp_popover = self.driver.find_element_by_tag_name("popover")
#         resp_scroll = resp_popover.find_element_by_tag_name("scrollview")
#         resp_webview = resp_scroll.find_element_by_tag_name("webview")
#         self.assertIsNotNone(resp_webview)
#         assessid_field = resp_webview.find_elements_by_tag_name("textfield")[0]
#         assessId = "111111"
#         assessid_field.click()
#         assessid_field.send_keys(assessId)
#         resp_webview.find_element_by_tag_name("button").click()
#         time.sleep( 5 )        
#         res = resp_webview.find_element_by_name("1 of 10")
#         self.assertIsNotNone(res)

    def test_js(self):
        # click on the Create file
        scroll = self.driver.find_element_by_tag_name("scrollview")
        tutorial = scroll.find_elements_by_tag_name("button")[4]
        tutorial.click()
        
		# the new page contains a webview
#         webview = scroll.find_elements_by_tag_name("webview")
        # Handle 0 is the webview for platform, Handle 1 is the webview for response
        handle = self.driver.window_handles[0]
        print "start switching"
        self.driver.switch_to_window(handle)
        print "end switching"
        print  self.driver.page_source
        test = self.driver.execute_script("return window.whiteboard)")
        
        
#         test = self.driver.execute_script('{ var test = "JSTest"; return test;}')
#         print test
#         self.driver.execute_script("mobile: leaveWebView")
#         test = self.driver.execute_script("return window.whiteboard)")
#         test = self.driver.execute_script("{ var wb = document.whiteboard; return wb.getPage();}")
        	
    def tearDown(self):
        self.driver.quit()
        
#     def javascript(self, script):  
# 		return self.driver.execute_script(""" 
#     (function() { 
#             with(this) { 
#               %(script)s 
#             } 
#           }).call(selenium.browserbot.getCurrentWindow()); 
#     """ % locals())

if __name__ == '__main__':
    unittest.main()
