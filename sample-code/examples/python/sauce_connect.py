"""An example of Appium running on Sauce using Sauce Connect to access a local webserver.

This test assumes SAUCE_USERNAME and SAUCE_ACCESS_KEY are environment variables
set to your Sauce Labs username and access key.

You'll also need Sauce-Connect.jar in this test directory so we can start it to enable
a tunnel between Sauce Labs and your machine

This is an All-In-One bundle test that does a lot more than usual test would. It does following
things that you would normally do in a different way:
- starts Sauce Connect - which you would normally start from console with
  "java -jar Sauce-Connect.jar SAUCE_USERNAME SAUCE_ACCESS_KEY"
- starts a local webserver on port 9999 that serves a sample string - normally you would
  like to connect to your own webserver
"""

import unittest
from selenium import webdriver
import os
import subprocess
import sys
import select
from SimpleHTTPServer import SimpleHTTPRequestHandler
from StringIO import StringIO
from threading import Thread
from BaseHTTPServer import HTTPServer
from SocketServer import ThreadingMixIn


SAUCE_USERNAME = os.environ.get('SAUCE_USERNAME')
SAUCE_ACCESS_KEY = os.environ.get('SAUCE_ACCESS_KEY')


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""


class MyRequestHandler(SimpleHTTPRequestHandler):
    """Serve a sample HTML page so we can check if test works properly"""
    def do_GET(self):

            f = StringIO()
            f.write("<html><body>Welcome to the flipside!</body></html>")
            f.seek(0)

            #send code 200 response
            self.send_response(200)

            #send header first
            self.send_header('Content-type', 'text-html')
            self.end_headers()

            #send file content to client
            self.wfile.write(f.read())
            f.close()
            return


class Selenium2OnSauce(unittest.TestCase):

    def setUpWebServer(self):
        # Setting up a local websever in separate thread on port 9999
        httpd = ThreadedHTTPServer(("", 9999), MyRequestHandler)
        sa = httpd.socket.getsockname()
        print "[HTTP Server] Serving HTTP on", sa[0], "port", sa[1], "..."
        thread = Thread(target=httpd.serve_forever)
        thread.daemon = True  # so server gets killed when we exit
        thread.start()

    def setUpTunnel(self):
        # Setting up Sauce Connect tunnel
        self.process = subprocess.Popen(["java -jar Sauce-Connect.jar %s %s" % (SAUCE_USERNAME, SAUCE_ACCESS_KEY)], shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        p = self.process
        print "[Sauce Connect]: Waiting for tunnel setup, this make take up to 30s"
        is_ready = False
        while True:
            reads = [p.stdout.fileno(), p.stderr.fileno()]
            ret = select.select(reads, [], [])

            for fd in ret[0]:
                if fd == p.stdout.fileno():
                    read = p.stdout.readline()
                    sys.stdout.write("[Sauce Connect]: %s" % read)

                    if "Connected! You may start your tests." in read:
                        print "[Sauce Connect]: Tunnel ready, running the test"
                        is_ready = True
                        break

                if fd == p.stderr.fileno():
                    read = p.stderr.readline()
                    sys.stderr.write("[Sauce Connect]: %s" % read)
                    if "Unable to access jarfile" in read:
                        self.process.terminate()
                        raise Exception("Sauce Connect could not start!")

            if is_ready:
                break

    def setUp(self):
        self.setUpWebServer()
        self.setUpTunnel()

        caps = {'browserName': ''}
        caps['platform'] = "OS X 10.8"
        caps['version'] = "6"
        caps['app'] = 'safari'
        caps['device'] = 'iPhone Simulator'
        caps['name'] = 'Appium - iOS - python'

        self.driver = webdriver.Remote(
            desired_capabilities=caps,
            command_executor="http://%s:%s@ondemand.saucelabs.com:80/wd/hub" % (SAUCE_USERNAME, SAUCE_ACCESS_KEY)
        )
        self.driver.implicitly_wait(30)

    def test_basic(self):
        driver = self.driver
        driver.get("http://127.0.0.1:9999/")
        body = self.driver.find_element_by_tag_name("body")
        self.assertTrue("Welcome to the flipside!" in body.text)

    def tearDown(self):
        print("Link to your job: https://saucelabs.com/jobs/%s" % self.driver.session_id)
        self.driver.quit()
        self.process.terminate()

if __name__ == '__main__':
    if not (SAUCE_USERNAME and SAUCE_ACCESS_KEY):
        print "Make sure you have SAUCE_USERNAME and SAUCE_ACCESS_KEY set as environment variables."
    else:
        unittest.main()
