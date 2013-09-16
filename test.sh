#!/bin/sh
set +e
mocha_args=""
ios_only=false
android_only=false
all_tests=true

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
    elif [[ "$arg" =~ " " ]]; then
        mocha_args="$mocha_args \"$arg\""
    else
        mocha_args="$mocha_args $arg"
    fi
done

appium_mocha="mocha -t 60000 -R spec $mocha_args"

mkdir -p ./test/functional/_joined

if $ios_only || $all_tests; then
    ios_tesfile="./test/functional/_joined/ios.js"
    ios_dirs=(prefs safari testapp uicatalog webview)
    join_testfiles $ios_testfile $ios_dirs
    $appium_mocha $ios_testfile
fi

if $android_only || $all_tests; then
    android_testfile="./test/functional/_joined/android.js"
    android_dirs=(apidemos selendroid)
    join_testfiles $android_testfile $android_dirs
    $appium_mocha $android_testfile
fi
