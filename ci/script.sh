#!/bin/bash
set -e

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
    ./reset.sh --hardcore --no-npmlink --dev --ios --verbose
    ./ci/upload_build_to_sauce.sh
    BRANCH_CAT=ios ./ci/git-push.sh
elif [[ $CI_CONFIG == 'build_android' ]]; then
    source ./ci/android_env
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --no-npmlink --dev --android --verbose 
    #./ci/upload_build_to_sauce.sh
    #BRANCH_CAT=android ./ci/git-push.sh
elif [[ $CI_CONFIG == 'build_selendroid' ]]; then
    source ./ci/android_env
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --no-npmlink --dev --selendroid
    #./ci/upload_build_to_sauce.sh
    #BRANCH_CAT=selendroid ./ci/git-push.sh
elif [[ $CI_CONFIG == 'build_gappium' ]]; then
    source ./ci/android_env
    echo OS X version: `sw_vers -productVersion`
    echo Xcode version: `xcodebuild build -version`
    echo Xcode path: `xcode-select --print-path`
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --no-npmlink --dev --gappium
    #./ci/upload_build_to_sauce.sh
    #BRANCH_CAT=gappium ./ci/git-push.sh
elif [[ $CI_CONFIG == 'functional' ]]; then
    TARBALL=sauce-storage:$(node ./ci/tools/build-upload-tool.js \
        ./ci/build-upload-info.json filename)
    SAUCE=1 \
    VERBOSE=1 \
    TARBALL="${TARBALL}" \
    DEVICE="ios71" \
    VERSION="7.1" \
    ./node_modules/.bin/mocha \
    --recursive \
    -g "@skip-ios71|@skip-ios7|@skip-ios-all" -i \
    $MOCHA_FILES
fi
