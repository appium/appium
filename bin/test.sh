#!/bin/sh
set +e
mocha_args=""
ios_only=false
ios6_only=false
ios7_only=false
ios71_only=false
android_only=false
android_arm_only=false
selendroid_only=false
all_tests=true
xcode_path=""
if command -v xcode-select 2>/dev/null; then
    xcode_path="$(xcode-select -print-path | sed s/\\/Contents\\/Developer//g)"
fi
did_switch_xcode=false

for arg in "$@"; do
    if [ "$arg" = "--ios" ]; then
        ios_only=true
        all_tests=false
    elif [ "$arg" = "--android" ]; then
        android_only=true
        all_tests=false
    elif [ "$arg" = "--android-arm" ]; then
        android_arm_only=true
        all_tests=false
    elif [ "$arg" = "--selendroid" ]; then
        selendroid_only=true
        all_tests=false
    elif [ "$arg" = "--ios6" ]; then
        ios6_only=true
        all_tests=false
    elif [ "$arg" = "--ios7" ]; then
        ios7_only=true
        all_tests=false
    elif [ "$arg" = "--ios71" ]; then
        ios71_only=true
        all_tests=false
    elif [ "$arg" =~ " " ]; then
        mocha_args="$mocha_args \"$arg\""
    else
        mocha_args="$mocha_args $arg"
    fi
done

appium_mocha="./node_modules/.bin/mocha --recursive $mocha_args"

run_ios_tests() {
    echo "RUNNING IOS $1 TESTS"
    echo "---------------------"
    if test -d /Applications/Xcode-$1.app; then
        echo "Found Xcode for iOS $1, switching to it"
        sudo xcode-select -switch /Applications/Xcode-$1.app
        did_switch_xcode=true
    else
        echo "Did not find /Applications/Xcode-$1.app, using default"
    fi
    echo 
    DEVICE=$2 time $appium_mocha -g $3 -i \
        test/functional/common \
        test/functional/ios
}

if $ios6_only || $ios_only || $all_tests; then
    run_ios_tests "6.1" "ios6" "@skip-ios6|@skip-ios-all"
fi

if $ios7_only || $all_tests; then
    run_ios_tests "7.0" "ios7" "@skip-ios7|@skip-ios-all"
fi

if $ios71_only || $all_tests; then
    run_ios_tests "7.1" "ios71" "@skip-ios71|@skip-ios7|@skip-ios-all"
fi

if $did_switch_xcode; then
    echo "Switching back to default Xcode ($xcode_path)"
    sudo xcode-select -switch $xcode_path
fi

if $android_only || $all_tests; then
    echo "RUNNING ANDROID TESTS"
    echo "---------------------"
    DEVICE=android time $appium_mocha \
        -g  '@skip-android-all|@android-arm-only' -i \
        test/functional/common \
        test/functional/android
fi

if $android_arm_only; then
    echo "RUNNING ANDROID (ARM) TESTS"
    echo "---------------------"
    DEVICE=android time $appium_mocha -g '@android-arm-only' \
        test/functional/common \
        test/functional/android
fi

if $selendroid_only || $all_tests; then
    echo "RUNNING SELENDROID TESTS"
    echo "---------------------"
    DEVICE=selendroid time $appium_mocha -g  '@skip-selendroid-all' -i \
        test/functional/selendroid \
        test/functional/common/gappium-specs.js
fi
