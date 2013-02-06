require 'rspec/expectations'
require 'selenium-webdriver'

APP_PATH = '../../../../../apps/TestApp/build/release-iphonesimulator/TestApp.app'

def capabilities
  {
    'browserName' => 'iOS',
    'platform' => 'Mac',
    'version' => '6.0',
    'app' => absolute_app_path
  }
end
 
def absolute_app_path
  File.join(File.dirname(__FILE__), APP_PATH)
end

def server_url
  "http://127.0.0.1:4723/wd/hub"
end
 
def selenium
  @driver ||= Selenium::WebDriver.for(:remote, :desired_capabilities => capabilities, :url => server_url)
end
