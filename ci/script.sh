#!/bin/bash
set -e

source ./ci/env.sh

function check_tarball {
    if [[ "${TARBALL}" == '' ]]; then
        echo Please set the TARBALL env variable!
        exit 1
    fi    
}

function show_functional_test_info {
    echo "APPIUM_BUILD_NUMBER --> ${APPIUM_BUILD_NUMBER}"
    echo "APPIUM_JOB_NUMBER --> ${APPIUM_JOB_NUMBER}"
    echo "TARBALL --> ${TARBALL}"
}

if [[ $CI_CONFIG == 'unit' ]]; then
    #npm install -g jshint grunt-cli
    #npm install
    # cd docs
    # appium_doc_lint || exit 1
    # cd -
    npm test
elif [[ $CI_CONFIG == 'build-ios' ]]; then
    check_tarball
    unset SUDO_UID
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    ./reset.sh --no-npmlink --dev --ios

    if [[ $UPLOAD_TO_SAUCE == 1 ]]; then
        TARBALL=$TARBALL ./ci/archive-build.sh
        # TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
    fi
elif [[ $CI_CONFIG == 'ios-functional-tests' ]]; then
    check_tarball
    show_functional_test_info
    npm install
    TARBALL=sauce-storage:$TARBALL \
    ./ci/tools/parallel-mocha.js \
    -p $IOS_CONCURRENCY \
    -c ios
elif [[ $CI_CONFIG == 'build-android' ]]; then
    check_tarball
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --no-npmlink --dev --android 
    if [[ $UPLOAD_TO_SAUCE == 1 ]]; then
        TARBALL=$TARBALL ./ci/archive-build.sh
        # TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
    fi
elif [[ $CI_CONFIG == 'android-functional-tests' ]]; then
    check_tarball
    show_functional_test_info
    npm install
    TARBALL=sauce-storage:$TARBALL \
    ./ci/tools/parallel-mocha.js \
    -p $ANDROID_CONCURRENCY \
    -c android
elif [[ $CI_CONFIG == 'gappium' ]]; then
    check_tarball
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        echo "Skipping this config for pull requests, it takes too long."
        exit 0 
    fi
    # source ./ci/android_env
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --ios --android --selendroid-quick --no-npmlink
    ./reset.sh --dev --gappium --no-npmlink
    # if [[ $UPLOAD_TO_SAUCE == 1 ]]; then
    #     TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
    #     TARBALL=sauce-storage:$TARBALL \
    #     ./ci/tools/parallel-mocha.js \
    #     -p $GAPPIUM_CONCURRENCY \
    #     -c gappium
    # fi
elif [[ $CI_CONFIG == 'selendroid' ]]; then
    check_tarball
    if [[ $TRAVIS_PULL_REQUEST != false ]]; then 
        echo "Skipping this config for pull requests, it takes too long."
        exit 0 
    fi
    # source ./ci/android_env
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --android --no-npmlink
    ./reset.sh --dev --selendroid-quick --no-npmlink
    # if [[ $UPLOAD_TO_SAUCE == 1 ]]; then
    #     TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
    #     TARBALL=sauce-storage:$TARBALL \
    #     ./ci/tools/parallel-mocha.js \
    #     -p $SELENDROID_CONCURRENCY \
    #     -c selendroid
    # fi
fi
