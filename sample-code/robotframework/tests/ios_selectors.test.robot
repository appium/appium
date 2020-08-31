*** Settings ***
Resource  ../resources/resource.robot
Test Setup     Open iOS Test App
Test Teardown  Close Application

*** Test Cases ***
Should find elements by ID
  ${element}  get webelement  ComputeSumButton
  element should be visible  ${element}

Should find elements by class name
  @{elements}  get webelements  class=XCUIElementTypeWindow
  length should be  ${elements}  2

Should find elements by nspredicate
  @{elements}  get webelements  nsp=visible = 1
  should be true  len('${elements}') >= 24

Should find elements by class chain
  @{elements}  get webelements  chain=XCUIElementTypeWindow[1]/*
  length should be  ${elements}  1

Should find elements by XPath
  @{elements}  get webelements  //XCUIElementTypeWindow//XCUIElementTypeButton
  log  len('${elements}')
  should be true  7 <= len('${elements}')  and len('${elements}') <= 8
