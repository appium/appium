#!/bin/bash
set -e

TARBALL=appium-${TRAVIS_BRANCH}-${TRAVIS_JOB_NUMBER}-${TRAVIS_COMMIT:0:10}.tar.bz2

RUN_SAUCE=false
if [[ $TRAVIS_SECURE_ENV_VARS == true ]] && [[ $TRAVIS_PULL_REQUEST == false ]]; then 
    RUN_SAUCE=true
fi

if [[ $CI_CONFIG == 'unit' ]]; then
    cd docs
    appium_doc_lint || exit 1
    cd -
    npm test
elif [[ $CI_CONFIG == 'ios' ]]; then
    unset SUDO_UID
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    ./reset.sh --no-npmlink --dev --ios
    if [[ $RUN_SAUCE == true ]]; then
        TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$TARBALL \
        node ./ci/tools/parallel-mocha.js \
        -p $IOS_CONCURRENCY \
        -c ios
    fi
elif [[ $CI_CONFIG == 'android' ]]; then
    source ./ci/android_env
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --no-npmlink --dev --android 
    if [[ $RUN_SAUCE == true ]]; then
        TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$TARBALL \
        node ./ci/tools/parallel-mocha.js \
        -p $ANDROID_CONCURRENCY \
        -c android
    fi
elif [[ $CI_CONFIG == 'gappium' ]]; then
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        echo "Skipping this config for pull requests, it takes too long."
        exit 0 
    fi
    source ./ci/android_env
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --ios --android --selendroid-quick --no-npmlink
    ./reset.sh --dev --gappium --no-npmlink
    if [[ $RUN_SAUCE == true ]]; then
        TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$TARBALL \
        node ./ci/tools/parallel-mocha.js \
        -p $GAPPIUM_CONCURRENCY \
        -c gappium
    fi
elif [[ $CI_CONFIG == 'selendroid' ]]; then
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        echo "Skipping this config for pull requests, it takes too long."
        exit 0 
    fi
    source ./ci/android_env
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --android --no-npmlink
    ./reset.sh --dev --selendroid-quick --no-npmlink
    if [[ $RUN_SAUCE == true ]]; then
        TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$TARBALL \
        node ./ci/tools/parallel-mocha.js \
        -p $SELENDROID_CONCURRENCY \
        -c selendroid
    fi
fi
