#!/bin/bash
set -e

if [[ "${TARBALL}" == '' ]]; then
    echo Please set the TARBALL env variable!
    exit 1
fi

TARGET=/tmp/${TARBALL}

echo "Starting to archive appium build into ${TARGET}."

tar \
    cfj ${TARGET} \
    -L \
    --exclude=.git \
    --exclude=submodules .

echo "Finished to archive appium build."
