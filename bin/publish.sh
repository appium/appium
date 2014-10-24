#!/bin/bash
set +e

if [[ "$1" = "" ]]; then
    branch="master"
else
    branch="$1"
fi

XCODE_PATH=$(xcode-select -print-path)
if test -d $XCODE_PATH/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator7.1.sdk; then
    echo "Confirmed iOS7.1 SDK available"
else
    echo "You don't have iOS 7.1 SDK available. Switch to Xcode 5?"
    exit 1
fi

node --version | grep "v0.10" >/dev/null
if [ $? -gt 0 ]; then
    echo "You need to publish Appium using Node 0.10.x, not $(node --version)"
    exit 1;
else
    echo "Node version OK"
fi

git remote | grep "upstream" >/dev/null
if [ $? -gt 0 ]; then
    echo "You need to have an 'upstream' remote to pull from / push tags to"
    exit 1
else
    echo "Git remote OK"
fi
git status | grep -E "nothing to commit.+working directory clean" >/dev/null
if [ $? -gt 0 ]; then
    echo "Working directory isn't clean, commit/clean then publish"
    exit 1
else
    echo "Working directory clean"
fi
git status | grep "Your branch is ahead" >/dev/null
if [ $? -eq 0 ]; then
    echo "Your branch isn't in sync with origin"
    exit 1
else
    echo "In sync with origin"
fi

set -e
echo "Getting latest from upstream:$branch"
git pull upstream $branch
./reset.sh --hardcore --real-safari --chromedriver-install-all --chromedriver-version 2.10
npm cache clear appium
npm publish
version=$(cat package.json | $(npm bin)/underscore extract version | sed 's/\"//g')
git tag -a "v$version" -m "tag appium@$version for npm publish"
git push --tags upstream $branch
