#!/bin/bash
#
#   reset.sh: INSTALL OR RESET APPIUM
#   This script should ensure that after pulling the most recent code,
#   you will be in a state where you can run tests and use appium
#
set -e
should_reset_android=false
should_reset_ios=false
should_reset_selendroid=false
should_reset_selendroid_quick=false
should_reset_gappium=false
should_reset_firefoxos=false
should_reset_realsafari=false
code_sign_identity='';
provisioning_profile='';
include_dev=false
prod_deps=false
appium_home=$(pwd)
reset_successful=false
has_reset_unlock_apk=false
has_reset_ime_apk=false
has_reset_settings_apk=false
apidemos_reset=false
toggletest_reset=false
hardcore=false
grunt="$(npm bin)/grunt"  # might not have grunt-cli installed with -g
verbose=false
chromedriver_version=false
chromedriver_install_all=false
npmlink=true
if test -d .git ; then
    is_git_checkout=true
else
    is_git_checkout=false
fi

while test $# != 0
do
    case "$1" in
        "--android") should_reset_android=true;;
        "--ios") should_reset_ios=true;;
        "--real-safari") should_reset_realsafari=true;;
        "--code-sign") code_sign_identity=$2;;
        "--profile") provisioning_profile=$2;;
        "--selendroid") should_reset_selendroid=true;;
        "--selendroid-quick") should_reset_selendroid_quick=true;;
        "--firefoxos") should_reset_firefoxos=true;;
        "--gappium") should_reset_gappium=true;;
        "--dev") include_dev=true;;
        "--prod") prod_deps=true;;
        "-v") verbose=true;;
        "--verbose") verbose=true;;
        "--hardcore") hardcore=true;;
        "--chromedriver-version") chromedriver_version=$2;;
        "--chromedriver-install-all") chromedriver_install_all=true;;
        "--udid") udid=$2;;
        "--no-npmlink") npmlink=false;;
    esac

    if [[ -n "$2" ]] && [[ "$2" != --* ]]; then
        shift
        shift
    else
        shift
    fi
done

run_cmd_output() {
    if $verbose ; then
        "$@"
    else
        "$@" 2> /dev/null
    fi
}

echo "* Determining platform"
if [ $(run_cmd_output uname -s) == "Darwin" ]; then
    platform="mac"
else
    platform="linux"
fi
echo "* Platform is $platform"

if ! $should_reset_android && ! $should_reset_ios && ! $should_reset_selendroid \
    && ! $should_reset_gappium && ! $should_reset_firefoxos && ! $should_reset_selendroid_quick ; then
    should_reset_android=true
    if [ "$platform" == "mac" ]; then
	should_reset_ios=true
    fi
    should_reset_selendroid=true
    should_reset_gappium=true
    should_reset_firefoxos=true
fi

if ! $should_reset_ios && $should_reset_realsafari; then
    should_reset_ios=true
fi

if $include_dev && ! $is_git_checkout ; then
    echo "Cannot run reset.sh in --dev mode if this is not a git repo"
    exit 1;
fi

run_cmd() {
    if $verbose ; then
        "$@"
    else
        "$@" >/dev/null 2>&1
    fi
}

reset_npm() {
    echo "RESETTING NPM"
    if $hardcore ; then
        echo "* Removing NPM modules"
        run_cmd rm -rf node_modules
        echo "* Clearing out old .appiumconfig.json"
        run_cmd rm -rf ./.appiumconfig      #remove legacy config file
        run_cmd rm -rf ./.appiumconfig.json
    fi
    if $prod_deps ; then
        echo "* Installing new or updated NPM modules"
        run_cmd npm install --production .
    else
        echo "* Installing new or updated NPM modules (including devDeps)"
        run_cmd npm install .
    fi
}

reset_general() {
    echo "RESETTING GENERAL"
    if $hardcore ; then
        echo "* Clearing out build dir"
        run_cmd rm -rf build
    fi
    run_cmd mkdir -p build
    if $is_git_checkout ; then
        echo "* Setting git revision data"
        run_cmd "$grunt" setGitRev
        if $include_dev ; then
            echo "* Linking git hooks"
            run_cmd rm -rf "$(pwd)"/.git/hooks/pre-commit
            run_cmd rm -rf "$(pwd)"/.git/hooks/pre-push
            run_cmd ln -s "$(pwd)"/test/pre-commit-hook.sh "$(pwd)"/.git/hooks/pre-commit
            run_cmd ln -s "$(pwd)"/test/pre-push-hook.sh "$(pwd)"/.git/hooks/pre-push
        fi
    else
        echo "* Nothing to do, not a git repo"
    fi
}

reset_sample_code() {
    echo "* Initializing sample code and test apps"
    if $hardcore ; then
        run_cmd "$grunt" getSampleCode:hardcore
    else
        run_cmd "$grunt" getSampleCode
    fi
}

reset_ios() {
    echo "RESETTING IOS"
    set +e
    sdk_ver=$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null)
    sdk_status=$?
    ios7_active=false
    ios8_active=false
    if [[ "$sdk_ver" == "7."* ]]; then
      ios7_active=true
    elif [[ "$sdk_ver" == "8."* ]]; then
      ios8_active=true
    fi
    if [ $sdk_status -gt 0 ] || (! $ios7_active && ! $ios8_active); then
      echo "---------------------------------------------------"
      echo "WARNING: you do not appear to have iOS7/8 SDK active"
      echo "---------------------------------------------------"
    fi
    set -e
    echo "* Setting iOS config to Appium's version"
    run_cmd "$grunt" setConfigVer:ios
    if $include_dev ; then
        if $npmlink ; then
            echo "* Cloning/npm linking appium-atoms"
            run_cmd ./bin/npmlink.sh -l appium-atoms
            echo "* Cloning/npm linking appium-instruments"
            run_cmd ./bin/npmlink.sh -l appium-instruments
            echo "* Cloning/npm linking appium-uiauto"
            run_cmd ./bin/npmlink.sh -l appium-uiauto
        fi
    fi
    if $should_reset_realsafari; then
        echo "* Building SafariLauncher for real devices"
        run_cmd rm -rf build/SafariLauncher
        run_cmd mkdir -p build/SafariLauncher
        touch build/SafariLauncher/target.xcconfig
        echo "BUNDLE_ID = com.bytearc.SafariLauncher" >> build/SafariLauncher/target.xcconfig
        if [[ ! -z $code_sign_identity ]]; then
          echo "IDENTITY_NAME = " $code_sign_identity >> build/SafariLauncher/target.xcconfig
        else
          echo "IDENTITY_NAME = iPhone Developer" >> build/SafariLauncher/target.xcconfig
        fi
        echo "IDENTITY_CODE = " $provisioning_profile >> build/SafariLauncher/target.xcconfig
        run_cmd "$grunt" buildSafariLauncherApp:iphoneos:"$appium_home/build/SafariLauncher/target.xcconfig"
        echo "* Copying SafariLauncher for real devices to build"
        run_cmd zip -r build/SafariLauncher/SafariLauncher node_modules/safari-launcher/build/Release-iphoneos/SafariLauncher.app
    fi
    echo "* Cloning/updating libimobiledevice-macosx"
    run_cmd git submodule update --init submodules/libimobiledevice-macosx
    echo "* Copying libimobiledevice-macosx to build"
    run_cmd rm -rf build/libimobiledevice-macosx
    run_cmd cp -r submodules/libimobiledevice-macosx build/libimobiledevice-macosx
    echo "* Cloning/updating deviceconsole"
    run_cmd git submodule update --init submodules/deviceconsole
    echo "* Building deviceconsole"
    run_cmd pushd submodules/deviceconsole
    run_cmd make
    run_cmd popd
    echo "* Copying deviceconsole to build"
    run_cmd rm -rf build/deviceconsole
    run_cmd mkdir -p build/deviceconsole
    run_cmd cp -r submodules/deviceconsole/deviceconsole build/deviceconsole/deviceconsole
}

get_apidemos() {
    echo "* Cloning/updating Android test app: ApiDemos"
    run_cmd git submodule update --init submodules/ApiDemos
    run_cmd rm -rf sample-code/apps/ApiDemos
    run_cmd ln -s "$appium_home"/submodules/ApiDemos "$appium_home"/sample-code/apps/ApiDemos
}

uninstall_android_app() {
    echo "* Attempting to uninstall android app $1"
    if (which adb >/dev/null); then
        if (adb devices | grep "device$" >/dev/null); then
            if [[ ! -z $udid ]]; then
                if (adb devices | grep "^$udid" >/dev/null); then
                    run_cmd adb -s $udid uninstall $1
                else
                    echo "* Device with serial $udid not found, skipping"
                fi
            elif [[ $(adb devices | grep "device$" | wc -l) -eq 1 ]]; then
                run_cmd adb uninstall $1
            else
                echo "* More than one device present, but no device serial provided, skipping (use --udid)"
            fi
        else
            echo "* No devices found, skipping"
        fi
    else
        echo "* ADB not found, skipping"
    fi
}

reset_apidemos() {
    run_cmd get_apidemos
    echo "* Configuring and cleaning/building Android test app: ApiDemos"
    run_cmd "$grunt" configAndroidApp:ApiDemos
    run_cmd "$grunt" buildAndroidApp:ApiDemos
    uninstall_android_app io.appium.android.apis
    apidemos_reset=true
}

reset_toggle_test() {
    echo "* Configuring and cleaning/building Android test app: ToggleTest"
    run_cmd "$grunt" configAndroidApp:ToggleTest
    run_cmd "$grunt" buildAndroidApp:ToggleTest
    uninstall_android_app com.example.toggletest
    toggletest_reset=true
}

reset_unlock_apk() {
    if ! $has_reset_unlock_apk; then
        run_cmd rm -rf build/unlock_apk
        run_cmd mkdir -p build/unlock_apk
        echo "* Building Unlock.apk"
        unlock_base="submodules/unlock_apk"
        run_cmd git submodule update --init $unlock_base
        run_cmd pushd $unlock_base
        run_cmd ant clean && run_cmd ant debug
        run_cmd popd
        run_cmd cp $unlock_base/bin/unlock_apk-debug.apk build/unlock_apk
        has_reset_unlock_apk=true
    fi
}

reset_unicode_ime() {
    if ! $has_reset_ime_apk; then
        run_cmd rm -rf build/unicode_ime_apk
        run_cmd mkdir -p build/unicode_ime_apk
        echo "* Building UnicodeIME.apk"
        ime_base="submodules/io.appium.android.ime"
        run_cmd git submodule update --init $ime_base
        run_cmd pushd $ime_base
        run_cmd ant clean && run_cmd ant debug
        run_cmd popd
        run_cmd cp $ime_base/bin/UnicodeIME-debug.apk build/unicode_ime_apk
        uninstall_android_app "io.appium.android.ime"
        has_reset_ime_apk=true
    fi
}

reset_settings_apk() {
    if ! $has_reset_settings_apk; then
        run_cmd rm -rf build/settings_apk
        run_cmd mkdir -p build/settings_apk
        echo "* Building Settings.apk"
        settings_base="submodules/io.appium.settings"
        run_cmd git submodule update --init $settings_base
        run_cmd pushd $settings_base
        run_cmd ant clean && run_cmd ant debug
        run_cmd popd
        run_cmd cp $settings_base/bin/settings_apk-debug.apk build/settings_apk
        uninstall_android_app "io.appium.settings"
        has_reset_settings_apk=true
    fi
}

link_appium_adb() {
    echo "* Cloning/npm linking appium-adb"
    run_cmd ./bin/npmlink.sh -l appium-adb
}

reset_android() {
    echo "RESETTING ANDROID"
    require_java
    echo "* Configuring Android bootstrap"
    run_cmd rm -rf build/android_bootstrap
    run_cmd "$grunt" configAndroidBootstrap
    echo "* Building Android bootstrap"
    run_cmd "$grunt" buildAndroidBootstrap
    reset_unlock_apk
    reset_unicode_ime
    reset_settings_apk
    if $include_dev ; then
        reset_apidemos
        reset_toggle_test
        if $npmlink ; then
            link_appium_adb
        fi
    fi
    echo "* Setting Android config to Appium's version"
    run_cmd "$grunt" setConfigVer:android
    reset_chromedriver
}

require_java() {
  [ '${JAVA_HOME:?"Warning: Make sure JAVA_HOME is set properly for Java builds."}' ]
}

reset_selendroid_quick() {
    echo "RESETTING SELENDROID (QUICK)"
    run_cmd rm -rf "${appium_home}/build/selendroid"
    run_cmd mkdir -p "${appium_home}/build/selendroid"
    run_cmd rm -rf /tmp/appium/selendroid
    run_cmd mkdir -p /tmp/appium/selendroid
    run_cmd pushd /tmp/appium/selendroid
    echo "* Downloading metatata"
    run_cmd wget http://search.maven.org/remotecontent?filepath=io/selendroid/selendroid-standalone/maven-metadata.xml -O maven-metadata.xml
    selendroid_version=$(grep latest maven-metadata.xml | sed 's/ *<\/*latest> *//g')
    echo "* Selendroid version is ${selendroid_version}"
    echo "* Downloading selendroid server"
    run_cmd wget https://github.com/selendroid/selendroid/releases/download/${selendroid_version}/selendroid-standalone-${selendroid_version}-with-dependencies.jar
    ANDROID_MANIFEST=$(jar tf selendroid-standalone-${selendroid_version}-with-dependencies.jar| grep AndroidManifest | grep -v class)
    run_cmd jar xf selendroid-standalone-${selendroid_version}-with-dependencies.jar $ANDROID_MANIFEST prebuild/selendroid-server-${selendroid_version}.apk
    mv $ANDROID_MANIFEST AndroidManifest.xml
    run_cmd cp /tmp/appium/selendroid/prebuild/selendroid-server-${selendroid_version}.apk "${appium_home}/build/selendroid/selendroid.apk"
    run_cmd cp /tmp/appium/selendroid/AndroidManifest.xml "${appium_home}/build/selendroid/AndroidManifest.xml"
    run_cmd popd
    run_cmd "$grunt" fixSelendroidAndroidManifest
    if $include_dev ; then
        if $npmlink ; then
            link_appium_adb
        fi
        if ! $apidemos_reset; then
            reset_apidemos
            uninstall_android_app io.appium.android.apis.selendroid
        fi
        if ! $toggletest_reset; then
            reset_toggle_test
            uninstall_android_app io.appium.toggletest.selendroid
        fi
        run_cmd pushd /tmp/appium/selendroid
        echo "* Downloading selendroid test app"
        run_cmd wget http://search.maven.org/remotecontent?filepath=io/selendroid/selendroid-test-app/${selendroid_version}/selendroid-test-app-${selendroid_version}.apk -O selendroid-test-app-${selendroid_version}.apk
        run_cmd popd
        run_cmd rm -rf "${appium_home}/sample-code/apps/selendroid-test-app.apk"
        cp /tmp/appium/selendroid/selendroid-test-app-${selendroid_version}.apk "${appium_home}/sample-code/apps/selendroid-test-app.apk"
        echo "* Attempting to uninstall app"
        # uninstalling app
        uninstall_android_app io.selendroid.testapp.selendroid
        uninstall_android_app io.selendroid.testapp
        # keep older versions of package around to clean up
        uninstall_android_app org.openqa.selendroid.testapp.selendroid
        uninstall_android_app org.openqa.selendroid.testapp
    fi
    echo "* Setting Selendroid config to Appium's version"
    run_cmd "$grunt" setConfigVer:selendroid
}

reset_selendroid() {
    echo "RESETTING SELENDROID"
    require_java
    echo "* Clearing out any old modified server apks"
    run_cmd rm -rf /tmp/selendroid*.apk
    echo "* Cloning/updating selendroid"
    run_cmd rm -rf submodules/selendroid/selendroid-server/target
    run_cmd git submodule update --init submodules/selendroid
    run_cmd rm -rf selendroid
    echo "* Building selendroid server and supporting libraries"
    run_cmd "$grunt" buildSelendroidServer
    run_cmd pushd submodules/selendroid
    run_cmd git reset --hard
    run_cmd popd
    reset_unlock_apk
    reset_unicode_ime
    if $include_dev ; then
        if $npmlink ; then
            link_appium_adb
        fi
        if ! $apidemos_reset; then
            reset_apidemos
            uninstall_android_app io.appium.android.apis.selendroid
        fi
        if ! $toggletest_reset; then
            reset_toggle_test
            uninstall_android_app io.appium.toggletest.selendroid
        fi
        echo "* Linking selendroid test app"
        run_cmd rm -rf "$appium_home"/sample-code/apps/selendroid-test-app.apk
        test_apk=$(ls "$appium_home"/submodules/selendroid/selendroid-test-app/target/*.apk | head -1)
        run_cmd ln -s "$test_apk" "$appium_home"/sample-code/apps/selendroid-test-app.apk
        uninstall_android_app io.selendroid.testapp.selendroid
        uninstall_android_app io.selendroid.testapp
        # keep older versions of package around to clean up
        uninstall_android_app org.openqa.selendroid.testapp.selendroid
        uninstall_android_app org.openqa.selendroid.testapp
    fi
    echo "* Setting Selendroid config to Appium's version"
    run_cmd "$grunt" setConfigVer:selendroid
}

reset_gappium() {
    if $include_dev ; then
        echo "RESETTING GAPPIUM"
        if $hardcore ; then
            echo "* Clearing out Gappium submodule"
            run_cmd rm -rf "$appium_home"/submodules/io.appium.gappium.sampleapp
        fi
        echo "* Clearing out old links"
        run_cmd rm -rf "$appium_home"/sample-code/apps/io.appium.gappium.sampleapp
        echo "* Cloning/updating Gappium"
        run_cmd git submodule update --init submodules/io.appium.gappium.sampleapp
        run_cmd pushd submodules/io.appium.gappium.sampleapp
        echo "* Building Gappium test app"
        run_cmd ./reset.sh -v --platform $platform
        run_cmd popd
        echo "* Linking Gappium test app"
        run_cmd ln -s "$appium_home"/submodules/io.appium.gappium.sampleapp "$appium_home"/sample-code/apps/io.appium.gappium.sampleapp
    fi
}

reset_chromedriver() {
    if $chromedriver_install_all ; then
        echo "RESETTING CHROMEDRIVER"
        echo "* Installing all chromedrivers, not just the ones for this system"
        run_cmd pushd node_modules/appium-chromedriver/
        run_cmd npm run-script chromedriver_all
        run_cmd popd
    fi
}

reset_firefoxos() {
    echo "RESETTING FIREFOXOS"
    echo "* Setting Firefox OS config to Appium's version"
    run_cmd "$grunt" setConfigVer:firefoxos
}

cleanup() {
    echo "CLEANING UP"
    echo "* Cleaning any temp files"
    run_cmd rm -rf /tmp/instruments_sock
    run_cmd rm -rf *.trace
}

main() {
    echo "---- Resetting / Initializing Appium ----"
    if $include_dev ; then
        echo "* Dev mode is on, will download/build test apps"
    fi
    if $hardcore ; then
        echo "* Hardcore mode is on, will do extra crazy stuff"
    fi
    if $prod_deps ; then
        echo "* Prod mode is on, will only install prod deps"
    fi
    reset_npm
    reset_general
    if $include_dev ; then
        reset_sample_code
    fi
    if $should_reset_ios ; then
        reset_ios
    fi
    if $should_reset_android ; then
        reset_android
    fi
    if $should_reset_selendroid ; then
        reset_selendroid
    fi
    if $should_reset_selendroid_quick ; then
        reset_selendroid_quick
    fi
    if $should_reset_firefoxos ; then
        reset_firefoxos
    fi
    if $should_reset_gappium ; then
        reset_gappium
    fi
    cleanup
    echo "* Setting build time and SHA info"
    run_cmd "$grunt" setBuildTime
    reset_successful=true
}

on_exit() {
    if $reset_successful ; then
        echo "---- reset.sh completed successfully ----"
    else
        echo "---- FAILURE: reset.sh exited with status $? ----"
        if ! $verbose ; then
            echo "---- Retry with --verbose to see errors ----"
        fi
    fi
}

trap on_exit EXIT
main
