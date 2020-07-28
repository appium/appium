*** Settings ***
Resource  ../resources/resource.robot

*** Test Cases ***
Should send keys to inputs
  Open iOS Test App
  ${attr}  get element attribute  class=XCUIElementTypeApplication  name
  should be equal  ${attr}  TestApp
  close application
  sleep  3s
  run keyword and expect error  No application is open  get webelement  class=XCUIElementTypeApplication