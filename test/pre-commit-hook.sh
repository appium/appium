#!/bin/sh
set +e
echo "Linting..."
grunt=$(npm bin)/grunt
out=$($grunt lint 2>&1)
status=$?
if [ "$status" != "0" ]; then
    echo "$out"
    exit $status
fi
echo "Running unit tests..."
mocha=$(npm bin)/mocha
out=$($mocha --recursive test/unit/ 2>&1)
status=$?
if [ "$status" != "0" ]; then
    echo "$out"
    exit $status
fi
