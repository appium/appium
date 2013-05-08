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
include_dev=false
appium_home=$(pwd)
grunt="$(npm bin)/grunt"

while test $# != 0
do
    case "$1" in
        "--android") should_reset_android=1;;
        "--ios") should_reset_ios=1;;
        "--selendroid") should_reset_selendroid=1;;
        "--dev") include_dev=true;;
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
    echo "Installing new or updated NPM modules"
    set +e
    if $include_dev ; then
        npm install .
    else
        npm install --production .
    fi
    install_status=$?
    set -e
    if [ $install_status -gt 0 ]; then
        echo "install failed. Trying again with sudo. Only do this if it's not a network error."
        sudo npm install .
    fi
    mkdir -p build
}

reset_ios() {
    echo "---- RESETTING IOS ----"
    echo "Downloading/updating instruments-without-delay"
    git submodule update --init submodules/instruments-without-delay
    echo "Building instruments-without-delay"
    pushd submodules/instruments-without-delay
    ./build.sh
    popd
    echo "Moving instruments-without-delay into build/iwd"
    rm -rf build/iwd
    mkdir build/iwd
    cp -R submodules/instruments-without-delay/build/* build/iwd
    if $include_dev ; then
        if [ ! -d "./sample-code/apps/UICatalog" ]; then
            echo "Downloading UICatalog app"
            $grunt downloadApp
        fi
        echo "Rebuilding iOS test apps"
        $grunt buildApp:TestApp
        $grunt buildApp:UICatalog
        $grunt buildApp:WebViewApp
    fi
    $grunt setConfigVer:ios
}

get_apidemos() {
    echo "Downloading/updating AndroidApiDemos"
    git submodule update --init submodules/ApiDemos
    rm -rf sample-code/apps/ApiDemos
    ln -s $appium_home/submodules/ApiDemos $appium_home/sample-code/apps/ApiDemos
}

reset_android() {
    echo "---- RESETTING ANDROID ----"
    echo "Building Android bootstrap"
    rm -rf build/android_bootstrap
    $grunt configAndroidBootstrap
    $grunt buildAndroidBootstrap
    if $include_dev ; then
        echo "Configuring and rebuilding Android test apps"
        get_apidemos
        $grunt configAndroidApp:ApiDemos
        $grunt buildAndroidApp:ApiDemos
    fi
    $grunt setConfigVer:android
}

reset_selendroid() {
    echo "---- RESETTING SELENDROID ----"
    echo "Downloading/updating selendroid"
    rm -rf submodules/selendroid/selendroid-server/target
    git submodule update --init submodules/selendroid
    rm -rf selendroid
    $grunt buildSelendroidServer
    if $include_dev ; then
        get_apidemos
        rm -rf $appium_home/sample-code/apps/WebViewDemo
        ln -s $appium_home/submodules/selendroid/selendroid-test-app $appium_home/sample-code/apps/WebViewDemo
    fi
    $grunt setConfigVer:selendroid
}

cleanup() {
    echo "---- CLEANING UP ----"
    echo "Cleaning temp files"
    rm -rf /tmp/instruments_sock
    rm -rf *.trace
}

echo "Resetting / Initializing Appium"
if $include_dev ; then
    echo "(Dev mode is on, will download/build test apps)"
fi
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
