#!/bin/bash
set -e
version=$(cat package.json | underscore extract version | sed 's/\"//g')
npm publish
git tag -a "v$version" -m "tag appium@$version for npm publish"
git push --tags upstream master
