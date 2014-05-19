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
    ./reset.sh --hardcore --no-npmlink --dev --ios
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        ./ci/upload_build_to_sauce.sh
        GLOB_PATTERNS='test/functional/common/**/*-specs.js'
        GLOB_PATTERNS+=',test/functional/ios/**/*-specs.js'
        node ci/tools/testfiles-tool.js split "${GLOB_PATTERNS}" > ci/test-split.json
        cp ci/mochas/ios71-mocha ci/mocha
        BRANCH_CAT=ios ./ci/git-push.sh
    fi
elif [[ $CI_CONFIG == 'build_android' ]]; then
    source ./ci/android_env
    echo JAVA_HOME: $JAVA_HOME
    ./reset.sh --hardcore --no-npmlink --dev --android 
    if [[ $TRAVIS_SECURE_ENV_VARS == true ]]; then
        rm sample-code/apps/ApiDemos
        mv submodules/ApiDemos sample-code/apps/
        ./ci/upload_build_to_sauce.sh
        GLOB_PATTERNS='test/functional/common/**/*-specs.js'
        GLOB_PATTERNS+=',test/functional/android/**/*-specs.js'
        node ci/tools/testfiles-tool.js split "${GLOB_PATTERNS}" > ci/test-split.json
        cp ci/mochas/android-mocha ci/mocha
        BRANCH_CAT=android ./ci/git-push.sh
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
        GLOB_PATTERNS='test/functional/selendroid/**/*-specs.js'
        node ci/tools/testfiles-tool.js split "${GLOB_PATTERNS}" > ci/test-split.json
        cp ci/mochas/selendroid-mocha ci/mocha
        BRANCH_CAT=selendroid ./ci/git-push.sh
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
        sed -i.bak s/CI_CONFIG=functional/CI_CONFIG=run_gappium/g ci/travis-functional.yml
        rm ci/*.bak
        BRANCH_CAT=gappium ./ci/git-push.sh
    fi
elif [[ $CI_CONFIG == 'functional' ]]; then
    TARBALL=sauce-storage:$(node ./ci/tools/build-upload-tool.js \
        ./ci/build-upload-info.json filename)
    echo node ci/tools/testfiles-tool.js list ci/test-split.json "${TEST_GROUP}"
    TEST_FILES=$(node ci/tools/testfiles-tool.js list ci/test-split.json "${TEST_GROUP}")
    echo "TEST_FILES --> ${TEST_FILES}"
    if [[ -n "$TEST_FILES" ]]; then
        TARBALL=$TARBALL ci/mocha ${TEST_FILES}
    fi
elif [[ $CI_CONFIG == 'run_gappium' ]]; then
    TARBALL=sauce-storage:$(node ./ci/tools/build-upload-tool.js \
        ./ci/build-upload-info.json filename)
    if [[ $TEST_GROUP == 'group 1' ]]; then
        TARBALL=$TARBALL ci/mochas/android-mocha test/functional/gappium/**/*-specs.js
    elif [[ $TEST_GROUP == 'group 2' ]]; then
        TARBALL=$TARBALL ci/mochas/ios71-mocha test/functional/gappium/**/*-specs.js
    elif [[ $TEST_GROUP == 'group 3' ]]; then
        TARBALL=$TARBALL ci/mochas/selendroid-mocha test/functional/gappium/**/*-specs.js
    fi
fi
