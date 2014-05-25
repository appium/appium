#!/bin/bash
set -e

BZ2_FILE=appium-ci-${TRAVIS_BRANCH}-${TRAVIS_JOB_NUMBER}-${TRAVIS_COMMIT:0:10}.tar.bz2

if [[ $CI_CONFIG == 'unit' ]]; then
    cd docs
    appium_doc_lint || exit 1
    cd -
    npm test
elif [[ $CI_CONFIG == 'build_ios' ]]; then
    unset SUDO_UID
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    ./reset.sh --hardcore --no-npmlink --dev --ios
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$BZ2_FILE \
        node ./ci/tools/parallel-mocha.js \
        -p 30 \
        -c ios
    fi
elif [[ $CI_CONFIG == 'build_android' ]]; then
    source ./ci/android_env
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --no-npmlink --dev --android 
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        rm sample-code/apps/ApiDemos
        mv submodules/ApiDemos sample-code/apps/
        ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$BZ2_FILE \
        node ./ci/tools/parallel-mocha.js \
        -p 30 \
        -c android
    fi
elif [[ $CI_CONFIG == 'build_selendroid' ]]; then
    source ./ci/android_env
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --no-npmlink --dev --selendroid
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        rm sample-code/apps/ApiDemos
        mv submodules/ApiDemos sample-code/apps/
        rm sample-code/apps/selendroid-test-app.apk
        mv submodules/selendroid/selendroid-test-app/target/selendroid-test-app-0.10.0.apk \
            sample-code/apps/selendroid-test-app.apk
        ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$BZ2_FILE \
        node ./ci/tools/parallel-mocha.js \
        -p 30 \
        -c selendroid
    fi
elif [[ $CI_CONFIG == 'build_gappium' ]]; then
    source ./ci/android_env
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --ios --android --selendroid --no-npmlink 
    ./reset.sh --gappium --dev --no-npmlink
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        rm sample-code/apps/io.appium.gappium.sampleapp
        mv submodules/io.appium.gappium.sampleapp sample-code/apps/
        ./ci/upload_build_to_sauce.sh
        TARBALL=sauce-storage:$BZ2_FILE \
        node ./ci/tools/parallel-mocha.js \
        -p 30 \
        -c gappium
    fi
fi
