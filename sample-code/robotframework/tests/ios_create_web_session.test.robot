*** Settings ***
Resource  ../resources/resource.robot

*** Test Cases ***
Should send keys to inputs
    open application  http://127.0.0.1:4723/wd/hub  automationName=${IOS_AUTOMATION_NAME}
  ...  platformName=${IOS_PLATFORM_NAME}  platformVersion=${IOS_PLATFORM_VERSION}
  ...  deviceName=${IOS_DEVICE_NAME}
  ...  browserName=Safari
  go to url  https://www.google.com
  ${page_title}  execute script  return document.title
  should be equal  ${page_title}  Google
  close application
  sleep  3s
  run keyword and expect error  No application is open  execute script  return document.title
