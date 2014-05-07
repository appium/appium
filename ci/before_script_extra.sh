#!/bin/bash
set -e
if [[ $CI_CONFIG == 'build_ios' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    sudo grunt authorize
elif [[ $CI_CONFIG == 'build_android' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh
    sudo grunt authorize
elif [[ $CI_CONFIG == 'build_selendroid' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh
    sudo grunt authorize
elif [[ $CI_CONFIG == 'build_gappium' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh
    npm install -g cordova
    sudo grunt authorize
fi
