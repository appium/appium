#!/bin/bash
set -e
git status | grep "nothing to commit (working directory clean)" >/dev/null
if [ $? -gt 0 ]; then
    echo "Working directory isn't clean, commit/clean then publish"
    exit 1
fi
version=$(cat package.json | underscore extract version | sed 's/\"//g')
rm -rf build/selendroid/selendroid.mod.apk
npm publish
git tag -a "v$version" -m "tag appium@$version for npm publish"
git push --tags upstream master
