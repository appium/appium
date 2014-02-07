#!/bin/sh
set +e
mocha_args=""
ios_only=false
ios6_only=false
ios7_only=false
android_only=false
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
    elif [ "$arg" = "--ios6" ]; then
        ios6_only=true
        all_tests=false
    elif [ "$arg" = "--ios7" ]; then
        ios7_only=true
        all_tests=false
    elif [ "$arg" =~ " " ]; then
        mocha_args="$mocha_args \"$arg\""
    else
        mocha_args="$mocha_args $arg"
    fi
done

to_func_test_path () {
  echo $@ | \
    sed -e "s/^/test\/functional\//g" | \
    sed -e "s/[[:space:]]/ test\/functional\//g"
}

appium_mocha="mocha -t 90000 -R spec $mocha_args"

if $ios6_only || $ios_only || $all_tests; then
    echo "RUNNING IOS 6.1 TESTS"
    echo "---------------------"
    ios_dirs="appium prefs safari testapp uicatalog webview gappium"
    if test -d /Applications/Xcode-6.1.app; then
        echo "Found Xcode for iOS 6.1, switching to it"
        sudo xcode-select -switch /Applications/Xcode-6.1.app
        did_switch_xcode=true
    else
        echo "Did not find /Applications/Xcode-6.1.app, using default"
    fi
    DEVICE=ios6 time $appium_mocha $(to_func_test_path $ios_dirs) -g  '@skip-ios6|@skip-all-ios' -i
fi

if $ios7_only || $all_tests; then
    echo "RUNNING IOS 7.0 TESTS"
    echo "---------------------"
    ios7_dirs="testapp safari uicatalog webview gappium"    
    if test -d /Applications/Xcode-7.0.app; then
        echo "Found Xcode for iOS 7.0, switching to it"
        sudo xcode-select -switch /Applications/Xcode-7.0.app
        did_switch_xcode=true
    else
        echo "Did not find /Applications/Xcode-7.0.app, using default"
    fi
    echo 
    DEVICE=ios7 time $appium_mocha $(to_func_test_path $ios7_dirs) -g  '@skip-ios7|@skip-all-ios' -i
fi

if $did_switch_xcode; then
    echo "Switching back to default Xcode ($xcode_path)"
    sudo xcode-select -switch $xcode_path
fi

if $android_only || $all_tests; then
    echo "RUNNING ANDROID TESTS"
    echo "---------------------"
    android_dirs="apidemos android toggletest"
    selendroid_dirs=" gappium selendroid"
    DEVICE=android time $appium_mocha $(to_func_test_path $android_dirs) -g  '@skip-all-android' -i && \
    DEVICE=selendroid time $appium_mocha $(to_func_test_path $selendroid_dirs) -g  '@skip-all-selendroid' -i
fi
