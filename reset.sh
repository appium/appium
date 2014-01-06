#!/bin/bash
#
#   reset.sh: INSTALL OR RESET APPIUM
#   This script should ensure that after pulling the most recent code,
#   you will be in a state where you can run tests and use appium
#
set -e
should_reset_android=false
should_reset_ios=false
should_reset_selendroid=false
should_reset_gappium=false
should_reset_firefoxos=false
should_reset_realsafari=false
code_sign_identity='';
provisioning_profile='';
include_dev=false
prod_deps=false
appium_home=$(pwd)
reset_successful=false
has_reset_unlock_apk=false
apidemos_reset=false
hardcore=false
grunt="$(npm bin)/grunt"  # might not have grunt-cli installed with -g
verbose=false

while test $# != 0
do
    case "$1" in
        "--android") should_reset_android=true;;
        "--ios") should_reset_ios=true;;
        "--real-safari") should_reset_realsafari=true;;
        "--code-sign") code_sign_identity=$2;;
        "--profile") provisioning_profile=$2;;
        "--selendroid") should_reset_selendroid=true;;
        "--firefoxos") should_reset_firefoxos=true;;
        "--gappium") should_reset_gappium=true;;
        "--dev") include_dev=true;;
        "--prod") prod_deps=true;;
        "-v") verbose=true;;
        "--verbose") verbose=true;;
        "--hardcore") hardcore=true;;
    esac
    if [[ -n "$2" ]] && [[ "$2" != --* ]]; then
      shift
      shift
    else
      shift
    fi
done

if ! $should_reset_android && ! $should_reset_ios && ! $should_reset_selendroid && ! $should_reset_gappium && ! $should_reset_firefoxos ; then
    should_reset_android=true
    should_reset_ios=true
    should_reset_selendroid=true
    should_reset_gappium=true
    should_reset_firefoxos=true
fi

if ! $should_reset_ios && $should_reset_realsafari; then
    should_reset_ios=true
fi

run_cmd() {
    if $verbose ; then
        "$@"
    else
        "$@" >/dev/null 2>&1
    fi
}

reset_general() {
    echo "RESETTING NPM"
    set +e
    if $hardcore ; then
        echo "* Removing NPM modules"
        run_cmd rm -rf node_modules
        echo "* Clearing out old .appiumconfig"
        run_cmd rm -rf ./.appiumconfig
    fi
    if $prod_deps ; then
        echo "* Installing new or updated NPM modules"
        run_cmd npm install --production .
    else
        echo "* Installing new or updated NPM modules (including devDeps)"
        run_cmd npm install .
    fi
    install_status=$?
    set -e
    if [ $install_status -gt 0 ]; then
        echo "install failed. Trying again with sudo. Only do this if it's not a network error."
        run_cmd sudo npm install .
    fi
    if $hardcore ; then
        echo "* Clearing out build dir"
        run_cmd rm -rf build
    fi
    run_cmd mkdir -p build
    echo "* Setting git revision data"
    run_cmd $grunt setGitRev
}

reset_ios() {
    echo "RESETTING IOS"
    set +e
    sdk_ver=$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null)
    sdk_status=$?
    ios7_active=true
    if [ $sdk_status -gt 0 ] || [[ "$sdk_ver" != "7."* ]]; then
      echo "--------------------------------------------------"
      echo "WARNING: you do not appear to have iOS7 SDK active"
      echo "--------------------------------------------------"
      ios7_active=false
    fi
    set -e
    echo "* Cloning/updating ForceQuitUnresponsiveApps"
    run_cmd git submodule update --init submodules/ForceQuitUnresponsiveApps
    echo "* Building ForceQuitUnresponsiveApps"
    run_cmd pushd submodules/ForceQuitUnresponsiveApps
    run_cmd ./build_force_quit.sh
    run_cmd popd
    echo "* Moving ForceQuitUnresponsiveApps into build/force_quit"
    run_cmd rm -rf build/force_quit
    run_cmd mkdir build/force_quit
    run_cmd cp -R submodules/ForceQuitUnresponsiveApps/bin/* build/force_quit
    echo "* Cloning/updating instruments-without-delay"
    run_cmd git submodule update --init submodules/instruments-without-delay
    if $ios7_active ; then
        echo "* Building instruments-without-delay"
        run_cmd pushd submodules/instruments-without-delay
        run_cmd ./build.sh
        run_cmd popd
        echo "* Moving instruments-without-delay into build/iwd"
        run_cmd rm -rf build/iwd
        run_cmd mkdir build/iwd
        run_cmd cp -R submodules/instruments-without-delay/build/* build/iwd
    fi
    run_cmd pushd ./assets
    echo "* Unzipping instruments without delay for XCode 4"
    run_cmd rm -rf ../build/iwd4
    run_cmd unzip iwd4.zip -d ../build/
    run_cmd popd
    echo "* Cloning/updating udidetect"
    run_cmd git submodule update --init submodules/udidetect
    echo "* Building udidetect"
    run_cmd pushd submodules/udidetect
    run_cmd make
    run_cmd popd
    echo "* Installing ios-sim-locale"
    run_cmd rm -f build/ios-sim-locale
    run_cmd cp assets/ios-sim-locale build/ios-sim-locale
    echo "* Moving udidetect into build/udidetect"
    run_cmd rm -rf build/udidetect
    run_cmd mkdir build/udidetect
    run_cmd cp -R submodules/udidetect/udidetect build/udidetect/
    echo "* Copying status/xpath libs for uiauto"
    run_cmd rm -rf $appium_home/lib/devices/ios/uiauto/lib/status.js
    run_cmd cp $appium_home/lib/server/status.js $appium_home/lib/devices/ios/uiauto/lib/status.js
    run_cmd rm -rf $appium_home/lib/devices/ios/uiauto/appium/xpath.js
    run_cmd cp $appium_home/lib/xpath.js $appium_home/lib/devices/ios/uiauto/appium/xpath.js
    if $ios7_active ; then
        echo "* Cleaning/rebuilding WebViewApp"
        run_cmd $grunt buildApp:WebViewApp
        run_cmd rm -rf build/WebViewApp
        run_cmd mkdir build/WebViewApp
        run_cmd cp -R sample-code/apps/WebViewApp/build/Release-iphonesimulator/WebViewApp.app \
            build/WebViewApp/
    fi
    if $include_dev ; then
        if $ios7_active ; then
            if $hardcore ; then
                echo "* Clearing out old UICatalog download"
                run_cmd rm -rf ./sample-code/apps/UICatalog*
            fi
            if [ ! -d "./sample-code/apps/UICatalog" ]; then
                echo "* Downloading UICatalog app source"
                run_cmd curl -L https://developer.apple.com/library/ios/samplecode/UICatalog/UICatalog.zip -o ./sample-code/apps/UICatalog.zip
                run_cmd pushd ./sample-code/apps
                echo "* Unzipping UICatalog app source"
                run_cmd unzip UICatalog.zip
                run_cmd popd
            fi
            echo "* Cleaning/rebuilding iOS test app: UICatalog"
            run_cmd $grunt buildApp:UICatalog
        fi
        echo "* Cleaning/rebuilding iOS test app: TestApp"
        run_cmd $grunt buildApp:TestApp
    fi
    echo "* Setting iOS config to Appium's version"
    run_cmd $grunt setConfigVer:ios
    echo "* Cloning/updating fruitstrap"
    run_cmd git submodule update --init submodules/fruitstrap
    echo "* Making fruitstrap"
    run_cmd pushd $appium_home/submodules/fruitstrap/
    run_cmd make fruitstrap
    run_cmd popd
    echo "* Copying fruitstrap to build"
    run_cmd rm -rf build/fruitstrap
    run_cmd mkdir -p build/fruitstrap
    run_cmd cp submodules/fruitstrap/fruitstrap build/fruitstrap
    if $should_reset_realsafari; then
        echo "* Cloning/updating SafariLauncher"
        run_cmd git submodule update --init submodules/SafariLauncher
        echo "* Building SafariLauncher for real devices"
        run_cmd rm -rf build/SafariLauncher
        run_cmd mkdir -p build/SafariLauncher
        run_cmd rm -f submodules/Safarilauncher/target.xcconfig
        echo "BUNDLE_ID = com.bytearc.SafariLauncher" >> submodules/Safarilauncher/target.xcconfig
        if [[ ! -z $code_sign_identity ]]; then
          echo "IDENTITY_NAME = " $code_sign_identity >> submodules/Safarilauncher/target.xcconfig
        else
          echo "IDENTITY_NAME = iPhone Developer" >> submodules/Safarilauncher/target.xcconfig
        fi
        echo "IDENTITY_CODE = " $provisioning_profile >> submodules/Safarilauncher/target.xcconfig
        run_cmd $grunt buildSafariLauncherApp:iphoneos:"target.xcconfig"
        echo "* Copying SafariLauncher for real devices to build"
        run_cmd zip -r build/SafariLauncher/SafariLauncher submodules/SafariLauncher/build/Release-iphoneos/SafariLauncher.app
    fi
    echo "* Cloning/updating libimobiledevice-macosx"
    run_cmd git submodule update --init submodules/libimobiledevice-macosx
    echo "* Copying libimobiledevice-macosx to build"
    run_cmd rm -rf build/libimobiledevice-macosx
    run_cmd cp -r submodules/libimobiledevice-macosx build/libimobiledevice-macosx
}

get_apidemos() {
    echo "* Cloning/updating Android test app: ApiDemos"
    run_cmd git submodule update --init submodules/ApiDemos
    run_cmd rm -rf sample-code/apps/ApiDemos
    run_cmd ln -s $appium_home/submodules/ApiDemos $appium_home/sample-code/apps/ApiDemos
}

uninstall_android_app() {
    echo "* Attempting to uninstall android app $1"
    if (which adb >/dev/null); then
        if (adb devices | grep "device$" >/dev/null); then
            run_cmd adb uninstall $1
        else
            echo "* No devices found, skipping"
        fi
    else
        echo "* ADB not found, skipping"
    fi
}

reset_apidemos() {
    run_cmd get_apidemos
    echo "* Configuring and cleaning/building Android test app: ApiDemos"
    run_cmd $grunt configAndroidApp:ApiDemos
    run_cmd $grunt buildAndroidApp:ApiDemos
    uninstall_android_app com.example.android.apis
    apidemos_reset=true
}

reset_gps_demo() {
    if $hardcore ; then
        echo "* Removing previous copies of the gps demo"
        run_cmd rm -rf sample-code/apps/gps-demo
        run_cmd rm -rf sample-code/apps/gps-demo.zip
    fi
    if [ ! -d sample-code/apps/gps-demo ]; then
        echo "* Downloading gps demo"
        run_cmd pushd sample-code/apps
        run_cmd curl http://www.impressive-artworx.de/tutorials/android/gps_tutorial_1.zip -o gps-demo.zip -s
        run_cmd unzip gps-demo.zip
        run_cmd mv GPSTutorial1 gps-demo
        run_cmd popd
    fi
}

reset_unlock_apk() {
    if ! $has_reset_unlock_apk; then
        run_cmd rm -rf build/unlock_apk
        run_cmd mkdir -p build/unlock_apk
        echo "* Building Unlock.apk"
        unlock_base="submodules/unlock_apk"
        run_cmd git submodule update --init $unlock_base
        run_cmd pushd $unlock_base
        run_cmd ant clean && run_cmd ant debug
        run_cmd popd
        run_cmd cp $unlock_base/bin/unlock_apk-debug.apk build/unlock_apk
        has_reset_unlock_apk=true
    fi
}

reset_android() {
    echo "RESETTING ANDROID"
    require_java
    echo "* Configuring Android bootstrap"
    run_cmd rm -rf build/android_bootstrap
    run_cmd $grunt configAndroidBootstrap
    echo "* Building Android bootstrap"
    run_cmd $grunt buildAndroidBootstrap
    reset_unlock_apk
    if $include_dev ; then
        reset_apidemos
        reset_gps_demo
    fi
    echo "* Setting Android config to Appium's version"
    run_cmd $grunt setConfigVer:android
}

require_java() {
  [ ${JAVA_HOME:?"Warning: Make sure JAVA_HOME is set properly for Java builds."} ]
}

reset_selendroid() {
    echo "RESETTING SELENDROID"
    require_java
    echo "* Clearing out any old modified server apks"
    run_cmd rm -rf /tmp/selendroid*.apk
    echo "* Cloning/updating selendroid"
    run_cmd rm -rf submodules/selendroid/selendroid-server/target
    run_cmd git submodule update --init submodules/selendroid
    run_cmd rm -rf selendroid
    echo "* Building selendroid server and supporting libraries"
    run_cmd $grunt buildSelendroidServer
    reset_unlock_apk
    if $include_dev ; then
        if ! $apidemos_reset; then
            reset_apidemos
            uninstall_android_app com.example.android.apis.selendroid
        fi
        echo "* Linking selendroid test app: WebViewDemo"
        run_cmd rm -rf $appium_home/sample-code/apps/WebViewDemo
        run_cmd ln -s $appium_home/submodules/selendroid/selendroid-test-app $appium_home/sample-code/apps/WebViewDemo
        uninstall_android_app io.selendroid.testapp.selendroid
        uninstall_android_app io.selendroid.testapp
        # keep older versions of package around to clean up
        uninstall_android_app org.openqa.selendroid.testapp.selendroid
        uninstall_android_app org.openqa.selendroid.testapp
    fi
    echo "* Setting Selendroid config to Appium's version"
    run_cmd $grunt setConfigVer:selendroid
}

reset_gappium() {
    if $include_dev ; then
        echo "RESETTING GAPPIUM"
        if $hardcore ; then
            echo "* Clearing out Gappium submodule"
            run_cmd rm -rf $appium_home/submodules/io.appium.gappium.sampleapp
        fi
        echo "* Clearing out old links"
        run_cmd rm -rf $appium_home/sample-code/apps/io.appium.gappium.sampleapp
        echo "* Cloning/updating Gappium"
        run_cmd git submodule update --init submodules/io.appium.gappium.sampleapp
        run_cmd pushd submodules/io.appium.gappium.sampleapp
        echo "* Building Gappium test app"
        run_cmd ./reset.sh -v
        run_cmd popd
        echo "* Linking Gappium test app"
        run_cmd ln -s $appium_home/submodules/io.appium.gappium.sampleapp $appium_home/sample-code/apps/io.appium.gappium.sampleapp
    fi
}

reset_firefoxos() {
    echo "RESETTING FIREFOXOS"
    echo "* Setting Firefox OS config to Appium's version"
    run_cmd $grunt setConfigVer:firefoxos
}

cleanup() {
    echo "CLEANING UP"
    echo "* Cleaning any temp files"
    run_cmd rm -rf /tmp/instruments_sock
    run_cmd rm -rf *.trace
}

main() {
    echo "---- Resetting / Initializing Appium ----"
    if $include_dev ; then
        echo "* Dev mode is on, will download/build test apps"
    fi
    if $hardcore ; then
        echo "* Hardcore mode is on, will do extra crazy stuff"
    fi
    if $prod_deps ; then
        echo "* Prod mode is on, will only install prod deps"
    fi
    reset_general
    if $should_reset_ios ; then
        reset_ios
    fi
    if $should_reset_android ; then
        reset_android
    fi
    if $should_reset_selendroid ; then
        reset_selendroid
    fi
    if $should_reset_firefoxos ; then
        reset_firefoxos
    fi
    if $should_reset_gappium ; then
        reset_gappium
    fi
    cleanup
    echo "* Setting build time and SHA info"
    run_cmd $grunt setBuildTime
    reset_successful=true
}

on_exit() {
    if $reset_successful ; then
        echo "---- reset.sh completed successfully ----"
    else
        echo "---- FAILURE: reset.sh exited with status $? ----"
        if ! $verbose ; then
            echo "---- Retry with --verbose to see errors ----"
        fi
    fi
}

trap on_exit EXIT
main
