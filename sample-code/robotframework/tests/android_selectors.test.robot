*** Settings ***
Documentation  Android Selectors
Resource  ../resources/resource.robot
Test Setup     Open Android Test App
Test Teardown  Close Application

*** Test Cases ***
Should find elements by Accessibility ID
  ${element}  get webelement  accessibility_id=Content
  element should be visible  ${element}

Should find elements by ID
  page should contain element  android:id/action_bar_container

Should find elements by class name
  @{elements}  get webelements  class=android.widget.FrameLayout
  length should be  ${elements}  3

Should find elements by XPath
  @{elements}  get webelements  //*[@class='android.widget.FrameLayout']
  length should be  ${elements}  3
