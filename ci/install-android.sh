#!/bin/bash
set +e

COMPONENTS=platform-tools,android-18,android-16,extra-android-support

mkdir -p $HOME/tools/android

( curl -L https://raw.github.com/sebv/android-sdk-installer/mac-support/android-sdk-installer | \
bash /dev/stdin --dir=$HOME/tools/android --install=$COMPONENTS ) &&\
source $HOME/tools/android/env

# to configure the emulator, add sysimg-18 to COMPONENTS and uncomment the line belor
# echo no | android create avd --force -n test -t android-18 --abi armeabi-v7a
