#!/bin/sh
set +e
mocha_args=""
ios_only=false
android_only=false
all_tests=true
for arg in "$@"; do
    if [[ "$arg" = "--ios" ]]; then
        ios_only=true
        all_tests=false
    elif [[ "$arg" = "--android" ]]; then
        android_only=true
        all_tests=false
    elif [[ "$arg" =~ " " ]]; then
        mocha_args="$mocha_args \"$arg\""
    else
        mocha_args="$mocha_args $arg"
    fi
done
alias appium_mocha="mocha -t 60000 -R spec $mocha_args"
if $ios_only || $all_tests; then
    appium_mocha test/functional/prefs
    appium_mocha test/functional/safari
    appium_mocha test/functional/testapp
    appium_mocha test/functional/uicatalog
    appium_mocha test/functional/webview
fi
if $android_only || $all_tests; then
    appium_mocha test/functional/apidemos
    appium_mocha test/functional/selendroid
fi
