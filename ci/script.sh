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
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        ./ci/upload_build_to_sauce.sh
        GLOB_PATTERN='test/functional/ios/testapp/**/*-specs.js'
        GLOB_PATTERN+=',test/functional/ios/uicatalog/**/*-specs.js'
        node ci/tools/testfiles-tool.js split "${GLOB_PATTERN}" > ci/test-split.json
        BRANCH_CAT=ios ./ci/git-push.sh
    fi
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
    env
    TARBALL=sauce-storage:$(node ./ci/tools/build-upload-tool.js \
        ./ci/build-upload-info.json filename)
    echo node ci/tools/testfiles-tool.js list ci/test-split.json "${TEST_GROUP}"
    TEST_FILES=$(node ci/tools/testfiles-tool.js list ci/test-split.json "${TEST_GROUP}")
    echo "TEST_FILES --> ${MOCHA_FILES}"
    SAUCE=1 \
    VERBOSE=1 \
    TARBALL="${TARBALL}" \
    DEVICE="ios71" \
    VERSION="7.1" \
    ./node_modules/.bin/mocha \
    --recursive \
    -g "@skip-ci|@skip-ios71|@skip-ios7|@skip-ios-all" -i \
    ${TEST_FILES}
fi
