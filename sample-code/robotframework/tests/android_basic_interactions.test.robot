*** Settings ***
Documentation  Android Basic Interactions
Resource  ../resources/resource.robot
Test Teardown  Close Application

*** Test Cases ***
Should send keys to search box and then check the value
  Open Android Test App  .app.SearchInvoke
  input text  txt_query_prefill  Hello world!
  click element  btn_start_search
  wait until page contains element  android:id/search_src_text
  element text should be  android:id/search_src_text  Hello world!

Should click a button that opens an alert and then dismisses it
  Open Android Test App  .app.AlertDialogSamples
  click element  two_buttons
  wait until page contains element  android:id/alertTitle
  element should contain text  android:id/alertTitle  Lorem ipsum dolor sit aie consectetur adipiscing
  ${close_dialog_button}  get webelement  android:id/button1
  click element  ${close_dialog_button}
