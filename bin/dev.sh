#!/bin/sh

function npmlink {
    git submodule update --init submodules/$1
    pushd submodules/$1
    npm link
    popd
    npm link $1
}

if [[ $1 == '--link' ]]; then
    npmlink appium-atoms
    npmlink appium-instruments
    npmlink appium-uiauto
    npmlink appium-adb
    npmlink appium-uiautomator
fi

if [[ $1 == '--unlink' ]]; then
    npm unlink appium-atoms
    npm unlink appium-instruments
    npm unlink appium-uiauto
    npm unlink appium-adb
    npm unlink appium-uiautomator
fi
