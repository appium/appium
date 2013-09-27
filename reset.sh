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
include_dev=false
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
        "--selendroid") should_reset_selendroid=true;;
        "--gappium") should_reset_gappium=true;;
        "--dev") include_dev=true;;
        "-v") verbose=true;;
        "--verbose") verbose=true;;
        "--hardcore") hardcore=true;;
    esac
    shift
done

if ! $should_reset_android && ! $should_reset_ios && ! $should_reset_selendroid && ! $should_reset_gappium ; then
    should_reset_android=true
    should_reset_ios=true
    should_reset_selendroid=true
    should_reset_gappium=true
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
    if $include_dev ; then
        echo "* Installing new or updated NPM modules (including devDeps)"
        run_cmd npm install .
    else
        echo "* Installing new or updated NPM modules"
        run_cmd npm install --production .
    fi
    install_status=$?
    set -e
    if [ $install_status -gt 0 ]; then
        echo "install failed. Trying again with sudo. Only do this if it's not a network error."
        run_cmd sudo npm install .
    fi
    run_cmd rm -rf build
    run_cmd mkdir build
    echo "* Setting git revision data"
    run_cmd $grunt setGitRev
}

reset_ios() {
    echo "RESETTING IOS"
    echo "* Cloning/updating instruments-without-delay"
    run_cmd git submodule update --init submodules/instruments-without-delay
    echo "* Building instruments-without-delay"
    run_cmd pushd submodules/instruments-without-delay
    run_cmd ./build.sh
    run_cmd popd
    echo "* Moving instruments-without-delay into build/iwd"
    run_cmd rm -rf build/iwd
    run_cmd mkdir build/iwd
    run_cmd cp -R submodules/instruments-without-delay/build/* build/iwd
    run_cmd pushd ./assets
    echo "* Unzipping instruments without delay for XCode 4"
    run_cmd unzip iwd4.zip -d ../build/
    run_cmd popd
    echo "* Cloning/updating udidetect"
    run_cmd git submodule update --init submodules/udidetect
    echo "* Building udidetect"
    run_cmd pushd submodules/udidetect
    run_cmd make
    run_cmd popd
    echo "* Moving udidetect into build/udidetect"
    run_cmd rm -rf build/udidetect
    run_cmd mkdir build/udidetect
    run_cmd cp -R submodules/udidetect/udidetect build/udidetect/
    if $include_dev ; then
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
        echo "* Cleaning/rebuilding iOS test app: TestApp"
        run_cmd $grunt buildApp:TestApp
        echo "* Cleaning/rebuilding iOS test app: UICatalog"
        run_cmd $grunt buildApp:UICatalog
        echo "* Cleaning/rebuilding iOS test app: WebViewApp"
        run_cmd $grunt buildApp:WebViewApp
    fi
    echo "* Setting iOS config to Appium's version"
    run_cmd $grunt setConfigVer:ios
    echo "* Cloning/updating fruitstrap"
    run_cmd git submodule update --init submodules/fruitstrap
    echo "* Making fruitstrap"
    run_cmd pushd $appium_home/submodules/fruitstrap/
    run_cmd make fruitstrap
    run_cmd popd
    echo "* Copying fruitstrap to build/"
    run_cmd rm -rf build/fruitstrap
    run_cmd mkdir -p build/fruitstrap
    run_cmd cp submodules/fruitstrap/fruitstrap build/fruitstrap
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
        uninstall_android_app io.selendroid.testapp
        uninstall_android_app io.selendroid.testapp.selendroid
        # keep older versions of package around to clean up
        uninstall_android_app org.openqa.selendroid.testapp
        uninstall_android_app org.openqa.selendroid.testapp.selendroid
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
    if $should_reset_gappium ; then
        reset_gappium
    fi
    cleanup
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
