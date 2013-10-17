#!/bin/bash
set +e

XCODE_PATH=$(xcode-select -print-path)
if test -d $XCODE_PATH/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator7.0.sdk; then
    echo "Confirmed iOS7 SDK available"
else
    echo "You don't have iOS 7 SDK available. Switch to Xcode 5?"
    exit 1
fi

git remote | grep "upstream" >/dev/null
if [ $? -gt 0 ]; then
    echo "You need to have an 'upstream' remote to pull from / push tags to"
    exit 1
fi
git status | grep "nothing to commit (working directory clean)" >/dev/null
if [ $? -gt 0 ]; then
    echo "Working directory isn't clean, commit/clean then publish"
    exit 1
fi
git status | grep "Your branch is ahead" >/dev/null
if [ $? -eq 0 ]; then
    echo "Your branch isn't in sync with master"
    exit 1
fi

set -e
git pull upstream master
./reset.sh --hardcore
npm publish
version=$(cat package.json | underscore extract version | sed 's/\"//g')
git tag -a "v$version" -m "tag appium@$version for npm publish"
git push --tags upstream master
