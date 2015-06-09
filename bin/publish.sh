#!/bin/bash
set +e

if [[ "$1" = "" ]]; then
    branch="1.4.0-stable"
else
    branch="$1"
fi

node --version | grep "v0.12" >/dev/null
if [ $? -gt 0 ]; then
    echo "You need to publish Appium using Node 0.12.x, not $(node --version)"
    exit 1;
else
    echo "Node version OK"
fi

git status | grep -E "nothing to commit.+working directory clean" >/dev/null
if [ $? -gt 0 ]; then
    echo "Working directory isn't clean, commit/clean then publish"
    exit 1
else
    echo "Working directory clean"
fi

set -e
#./reset.sh --hardcore --chromedriver-install-all --chromedriver-version 2.15
version=$(cat package.json | $(npm bin)/underscore extract version | sed 's/\"//g')
echo "Clearing npm cache"
npm cache clear appium
echo "Publishing on npm"
if [[ "$version" =~ "beta" ]]; then
    npm publish --tag beta
else
    npm publish
fi
echo "Git tagging"
git tag -a "v$version" -m "tag appium@$version for npm publish"
git push --tags upstream $branch
