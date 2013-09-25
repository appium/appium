#!/bin/sh
set +e
mocha_args=""
ios_only=false
ios7_only=false
android_only=false
all_tests=true
xcode_path="$(xcode-select -print-path | sed s/\\/Contents\\/Developer//g)"
did_switch_xcode=false

function join_testfiles {
    outfile=$1
    rm -rf $outfile
    shift
    indirs=$@
    pre="(function() {"
    post="})();"
    out=""
    touch $outfile
    for indir in $indirs; do
        for infile in ./test/functional/$indir/*.js; do
            echo "Collating test/functional/$indir/$infile..."
            echo "$pre\n" >> $outfile
            cat $infile >> $outfile
            echo "\n$post\n" >> $outfile
        done
    done
}

for arg in "$@"; do
    if [[ "$arg" = "--ios" ]]; then
        ios_only=true
        all_tests=false
    elif [[ "$arg" = "--android" ]]; then
        android_only=true
        all_tests=false
    elif [[ "$arg" = "--ios7" ]]; then
        ios7_only=true
        all_tests=false
    elif [[ "$arg" =~ " " ]]; then
        mocha_args="$mocha_args \"$arg\""
    else
        mocha_args="$mocha_args $arg"
    fi
done

appium_mocha="mocha -t 60000 -R spec $mocha_args"

mkdir -p ./test/functional/_joined

if $ios_only || $all_tests; then
    echo "RUNNING IOS 6.1 TESTS"
    echo "---------------------"
    ios_testfile="./test/functional/_joined/ios.js"
    ios_dirs="prefs safari testapp uicatalog webview"
    join_testfiles $ios_testfile $ios_dirs
    if test -d /Applications/Xcode-6.1.app; then
        echo "Found Xcode for iOS 6.1, switching to it"
        sudo xcode-select -switch /Applications/Xcode-6.1.app
        did_switch_xcode=true
    else
        echo "Did not find /Applications/Xcode-6.1.app, using default"
    fi
    $appium_mocha $ios_testfile
fi

if $ios7_only || $all_tests; then
    echo "RUNNING IOS 7.0 TESTS"
    echo "---------------------"
    ios7_testfile="./test/functional/_joined/ios7.js"
    ios7_dirs="testapp uicatalog webview"
    join_testfiles $ios7_testfile $ios7_dirs
    if test -d /Applications/Xcode-7.0.app; then
        echo "Found Xcode for iOS 7.0, switching to it"
        sudo xcode-select -switch /Applications/Xcode-7.0.app
        did_switch_xcode=true
    else
        echo "Did not find /Applications/Xcode-7.0.app, using default"
    fi
    $appium_mocha $ios7_testfile
fi

if $did_switch_xcode; then
    echo "Switching back to default Xcode"
    sudo xcode-select -switch $xcode_path
fi

if $android_only || $all_tests; then
    echo "RUNNING ANDROID TESTS"
    echo "---------------------"
    android_testfile="./test/functional/_joined/android.js"
    android_dirs="apidemos selendroid"
    join_testfiles $android_testfile $android_dirs
    $appium_mocha $android_testfile
fi
