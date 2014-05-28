#!/bin/bash
set -e
androids=','

while test $# != 0
do
    case "$1" in
        "--api-19") androids+='android-19,';;
        "--api-18") androids+='android-18,';;
        "--api-16") androids+='android-16,';;
    esac

    if [[ -n "$2" ]] && [[ "$2" != --* ]]; then
        shift
        shift
    else
        shift
    fi
done

COMPONENTS=build-tools-19.0.3${androids}extra-android-support

mkdir -p $HOME/tools/android

( curl -L https://raw.github.com/appium/android-sdk-installer/master/android-sdk-installer | \
bash /dev/stdin --dir=$HOME/tools/android --install=$COMPONENTS ) &&\
source $HOME/tools/android/env

# to configure the emulator, add sysimg-18 to COMPONENTS and uncomment the line belor
# echo no | android create avd --force -n test -t android-18 --abi armeabi-v7a
