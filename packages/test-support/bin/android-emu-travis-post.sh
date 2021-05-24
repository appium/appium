#!/bin/bash

if [ ${START_EMU} != "1" ]; then
    exit 0
fi

# Fail fast if emulator process cannot start
pgrep -nf avd || exit 1

: ${EMU_STARTUP_TIMEOUT:=360}

# make sure the emulator is ready
adb wait-for-device get-serialno
secondsStarted=$(date +%s)
while [[ $(( $(date +%s) - secondsStarted )) -lt $EMU_STARTUP_TIMEOUT ]]; do
    pstat=$(adb shell ps)
    if ! [[ $pstat =~ "root " ]]; then
        # In recent APIs running `ps` without `-A` only returns
        # processes belonging to the current user (in this case `shell`)
        pstat=$(adb shell ps -A)
    fi

    if [[ $pstat =~ "com.android.systemui" ]]; then
        echo "System UI process is running. Checking services availability"
        if adb shell "ime list && pm get-install-location && echo PASS" | grep -q "PASS"; then
            break
        fi
    fi

    sleep 5
    secondsElapsed=$(( $(date +%s) - secondsStarted ))
    secondsLeft=$(( EMU_STARTUP_TIMEOUT - secondsElapsed ))
    echo "Waiting until emulator finishes services startup; ${secondsElapsed}s elapsed; ${secondsLeft}s left"
done
bootDuration=$(( $(date +%s) - secondsStarted ))
if [[ $bootDuration -ge $EMU_STARTUP_TIMEOUT ]]; then
    echo "Emulator has failed to fully start within ${EMU_STARTUP_TIMEOUT}s"
    exit 1
fi
echo "Emulator booting took ${bootDuration}s"

adb shell input keyevent 82
