#!/bin/sh
set +e
alias appium_mocha="mocha -t 60000 -R spec $*"
appium_mocha test/functional/apidemos
appium_mocha test/functional/prefs
appium_mocha test/functional/safari
appium_mocha test/functional/selendroid
appium_mocha test/functional/testapp
appium_mocha test/functional/uicatalog
appium_mocha test/functional/webview
