#!/bin/bash
set -e

if [[ "${TARGET}" == '' ]]; then
    echo Please set the TARGET env variable!
    exit 1
fi

echo "Starting to archive appium build into ${TARGET}."

tar \
    cfjp ${TARGET} \
    --exclude=.git \
    --exclude=artifacts \
    --exclude=submodules .

echo "Finished to archive appium build."
