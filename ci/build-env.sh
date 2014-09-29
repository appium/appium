#!/bin/bash
set -e

TARBALL=appium-${DEVICE_TYPE}-${BUILD_NUMBER}-${GIT_COMMIT:0:10}.tar.bz2

echo "TARBALL=${TARBALL}" >> ./ci/build-env.properties

cat ./ci/build-env.properties
