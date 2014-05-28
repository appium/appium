#!/bin/bash
set -e

if [[ $CI_CONFIG == 'ios' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    sudo grunt authorize
elif [[ $CI_CONFIG == 'android' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh
    sudo grunt authorize
elif [[ $CI_CONFIG == 'others' ]]; then
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        # Skipping this config for pull requests, it takes too long.
        exit 0 
    fi
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh
    npm install -g cordova
    sudo grunt authorize
fi
