#!/bin/bash
#
#   reset.sh: INSTALL OR RESET APPIUM
#   This script should ensure that after pulling the most recent code,
#   you will be in a state where you can run tests and use appium
#
set -e
should_reset_android=0
should_reset_ios=0
should_reset_selendroid=0
appium_home=$(pwd)
selendroid_ver="0.3"

while test $# != 0
do
    case "$1" in
        "--android") should_reset_android=1;;
        "--ios") should_reset_ios=1;;
        "--selendroid") should_reset_selendroid=1;;
    esac
    shift
done

if [[ $should_reset_android -eq 0 ]] && [[ $should_reset_ios -eq 0 ]] && [[ $should_reset_selendroid -eq 0 ]]; then
    should_reset_android=1
    should_reset_ios=1
    should_reset_selendroid=1
fi

reset_general() {
    echo "---- RESETTING NPM ----"
    echo "Clearing dev version of wd.js"
    set +e  # we expect next command might fail without sudo privs
    rm -rf node_modules/wd
    rm_status=$?
    set -e  # turn error checking back on so we can exit if sudo branch doesn't work
    if [ $rm_status -gt 0 ]; then
        echo "rm failed. Trying again with sudo."
        sudo rm -rf node_modules/wd
    fi
    echo "Installing wd.js from master and new or updated NPM modules"
    set +e
    npm install .
    install_status=$?
    set -e
    if [ $install_status -gt 0 ]; then
        echo "install failed. Trying again with sudo."
        sudo npm install .
    fi
}

reset_ios() {
    echo "---- RESETTING IOS ----"
    echo "Downloading/updating instruments-without-delay"
    git submodule update --init submodules/instruments-without-delay
    echo "Building instruments-without-delay"
    pushd submodules/instruments-without-delay
    ./build.sh
    popd
    if [ ! -d "./sample-code/apps/UICatalog" ]; then
        echo "Downloading UICatalog app"
        grunt downloadApp
    fi
    echo "Rebuilding iOS test apps"
    grunt buildApp:TestApp
    grunt buildApp:UICatalog
    grunt buildApp:WebViewApp
}

get_apidemos() {
    echo "Downloading/updating AndroidApiDemos"
    git submodule update --init submodules/ApiDemos
    rm -rf sample-code/apps/ApiDemos
    ln -s $appium_home/submodules/ApiDemos $appium_home/sample-code/apps/ApiDemos
}

reset_android() {
    echo "---- RESETTING ANDROID ----"
    get_apidemos
    echo "Building Android bootstrap"
    grunt configAndroidBootstrap
    grunt buildAndroidBootstrap
    echo "Configuring and rebuilding Android test apps"
    grunt configAndroidApp:ApiDemos
    grunt buildAndroidApp:ApiDemos
}

reset_selendroid() {
    echo "---- RESETTING SELENDROID ----"
    get_apidemos
    echo "Downloading/updating selendroid"
    rm -rf submodules/selendroid/selendroid-server/target
    git submodule update --init submodules/selendroid
    rm -rf selendroid
    ln -s $appium_home/submodules/selendroid $appium_home/selendroid
    ln -s $appium_home/selendroid/selendroid-test-app $appium_home/sample-code/apps/WebViewDemo
    grunt buildSelendroidAndroidApp:WebViewDemo
}

cleanup() {
    echo "---- CLEANING UP ----"
    echo "Cleaning temp files"
    rm -rf /tmp/instruments_sock
    rm -rf *.trace
}

echo "Resetting / Initializing Appium"
reset_general
if [ $should_reset_ios -eq 1 ]; then
    reset_ios
fi
if [ $should_reset_android -eq 1 ]; then
    reset_android
fi
if [ $should_reset_selendroid -eq 1 ]; then
    reset_selendroid
fi
cleanup
