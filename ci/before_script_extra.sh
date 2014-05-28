#!/bin/bash
set -e

if [[ $CI_CONFIG == 'ios' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    sudo grunt authorize
elif [[ $CI_CONFIG == 'android' ]]; then
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh --api-18 
    sudo grunt authorize
elif [[ $CI_CONFIG == 'gappium' ]]; then
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        # Skipping this config for pull requests, it takes too long.
        exit 0
    fi
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh --api-19 --api-18 --api-16
    npm install -g cordova
    sudo grunt authorize
elif [[ $CI_CONFIG == 'selendroid' ]]; then
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        # Skipping this config for pull requests, it takes too long.
        exit 0
    fi
    ./ci/installers/install-ant.sh
    ./ci/installers/install-maven.sh
    ./ci/installers/install-android.sh --api-18 --api-16
    sudo grunt authorize
fi
