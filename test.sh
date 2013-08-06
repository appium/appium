#!/bin/sh
set +e
mocha_args=""
for arg in "$@"; do
    if [[ "$arg" =~ " " ]]; then
        mocha_args="$mocha_args \"$arg\""
    else
        mocha_args="$mocha_args $arg"
    fi
done
alias appium_mocha="mocha -t 60000 -R spec $mocha_args"
appium_mocha test/functional/apidemos
appium_mocha test/functional/prefs
appium_mocha test/functional/safari
appium_mocha test/functional/selendroid
appium_mocha test/functional/testapp
appium_mocha test/functional/uicatalog
appium_mocha test/functional/webview
