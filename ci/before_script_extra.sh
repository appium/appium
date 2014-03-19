#!/bin/bash
set +e
if [[ $CI_CONFIG == 'build' ]]; then
    ./ci/install-ant.sh
    ./ci/install-maven.sh
    ./ci/install-android.sh
    npm install -g cordova
    sudo grunt authorize
fi
