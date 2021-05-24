#!/bin/bash

set -ev

if [ ${START_EMU} = "1" ]; then
    emuTag=""
    if [ -n "$ANDROID_EMU_TAG" ]; then
        emuTag="--tag $ANDROID_EMU_TAG"
    fi
    echo no | android create avd --force -n ${ANDROID_EMU_NAME} -t ${ANDROID_EMU_TARGET} --abi ${ANDROID_EMU_ABI} ${tag}
    emulator -avd ${ANDROID_EMU_NAME} -no-audio -no-window &
fi

exit 0;
