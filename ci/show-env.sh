#!/bin/bash
set +e
echo OS X version: `sw_vers -productVersion`
echo Xcode version: `xcodebuild build -version`
echo Xcode path: `xcode-select --print-path`
echo Node.js version: `node -v`
echo JAVA_HOME: $JAVA_HOME

