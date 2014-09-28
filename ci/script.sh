#!/bin/bash
set -e

# Configuration
export SAUCE_REST_ROOT=https://saucelabs.com/rest/v1


TARBALL=appium-${CI_CONFIG}-${BUILD_NUMBER}-${GIT_COMMIT:0:10}.tar.bz2

if [[ $CI_CONFIG == 'unit' ]]; then
    npm install -g jshint grunt-cli
    npm install
    # cd docs
    # appium_doc_lint || exit 1
    # cd -
    npm test
elif [[ $CI_CONFIG == 'build-ios' ]]; then
    echo $TARBALL
    unset SUDO_UID
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    ./reset.sh --no-npmlink --dev --ios
    if [[ $UPLOAD_TO_SAUCE == 1 ]]; then
        TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
        # TARBALL=sauce-storage:$TARBALL \
        # ./ci/tools/parallel-mocha.js \
        # -p $IOS_CONCURRENCY \
        # -c ios
    fi
elif [[ $CI_CONFIG == 'build-android' ]]; then
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --no-npmlink --dev --android 
    if [[ $UPLOAD_TO_SAUCE == 1 ]]; then
        TARBALL=$TARBALL ./ci/upload_build_to_sauce.sh
        # TARBALL=sauce-storage:$TARBALL \
        # ./ci/tools/parallel-mocha.js \
        # -p $ANDROID_CONCURRENCY \
        # -c android
    fi
elif [[ $CI_CONFIG == 'gappium' ]]; then
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
