*** Settings ***
Resource  ../resources/resource.robot
Test Setup  Open iOS Test App
Test Teardown  Close Application

*** Test Cases ***
Should send keys to inputs
  ${text_field_el}  get webelement  TextField1
  ${value}  get element attribute  ${text_field_el}  value
  should be equal  ${value}  ${None}
  input text  ${text_field_el}  Hello World!
  ${value2}  get element attribute  ${text_field_el}  value
  should be equal  ${value2}  Hello World!

Should click a button that opens an alert
  click element  show alert
  ${alert_el}  get webelement  accessibility_id=Cool title
  ${title}  get element attribute  ${alert_el}  name
  should be equal  ${title}  Cool title
