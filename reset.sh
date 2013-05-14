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
include_dev=false
appium_home=$(pwd)
reset_successful=false
grunt="$(npm bin)/grunt"  # might not have grunt-cli installed with -g
verbose=false

while test $# != 0
do
    case "$1" in
        "--android") should_reset_android=true;;
        "--ios") should_reset_ios=true;;
        "--selendroid") should_reset_selendroid=true;;
        "--dev") include_dev=true;;
        "-v") verbose=true;;
        "--verbose") verbose=true;;
    esac
    shift
done

if ! $should_reset_android && ! $should_reset_ios && ! $should_reset_selendroid ; then
    should_reset_android=true
    should_reset_ios=true
    should_reset_selendroid=true
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
    run_cmd mkdir -p build
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
    if $include_dev ; then
        if [ ! -d "./sample-code/apps/UICatalog" ]; then
            echo "* Downloading UICatalog app"
            run_cmd $grunt downloadApp
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
}

get_apidemos() {
    echo "* Cloning/updating Android test app: ApiDemos"
    run_cmd git submodule update --init submodules/ApiDemos
    run_cmd rm -rf sample-code/apps/ApiDemos
    run_cmd ln -s $appium_home/submodules/ApiDemos $appium_home/sample-code/apps/ApiDemos
}

reset_android() {
    echo "RESETTING ANDROID"
    echo "* Configuring Android bootstrap"
    run_cmd rm -rf build/android_bootstrap
    run_cmd $grunt configAndroidBootstrap
    echo "* Building Android bootstrap"
    run_cmd $grunt buildAndroidBootstrap
    if $include_dev ; then
        run_cmd get_apidemos
        echo "* Configuring and cleaning/building Android test app: ApiDemos"
        run_cmd $grunt configAndroidApp:ApiDemos
        run_cmd $grunt buildAndroidApp:ApiDemos
    fi
    echo "* Setting Android config to Appium's version"
    run_cmd $grunt setConfigVer:android
}

reset_selendroid() {
    echo "RESETTING SELENDROID"
    echo "* Cloning/updating selendroid"
    run_cmd rm -rf submodules/selendroid/selendroid-server/target
    run_cmd git submodule update --init submodules/selendroid
    run_cmd rm -rf selendroid
    echo "* Building selendroid server and supporting libraries"
    run_cmd $grunt buildSelendroidServer
    if $include_dev ; then
        get_apidemos
        echo "* Linking selendroid test app: WebViewDemo"
        run_cmd rm -rf $appium_home/sample-code/apps/WebViewDemo
        run_cmd ln -s $appium_home/submodules/selendroid/selendroid-test-app $appium_home/sample-code/apps/WebViewDemo
    fi
    echo "* Setting Selendroid config to Appium's version"
    run_cmd $grunt setConfigVer:selendroid
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
