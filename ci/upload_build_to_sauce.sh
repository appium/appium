#!/bin/sh
set -e

BZ2_FILE=appium-ci-${TRAVIS_BRANCH}-${TRAVIS_JOB_NUMBER}-${TRAVIS_COMMIT:0:10}.tar.bz2
UPLOAD_INFO_FILE=/tmp/build-upload-info.json

# zipping/uploading
tar \
    cfj - \
    --exclude=.git \
    --exclude=submodules . | \
curl \
    -k \
    --progress-bar \
    -u $SAUCE_USERNAME:$SAUCE_ACCESS_KEY \
    -X POST "${SAUCE_REST_ROOT}/storage/${SAUCE_USERNAME}/${BZ2_FILE}?overwrite=true" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @- \
    -o $UPLOAD_INFO_FILE

# checking/printing result file
node ci/tools/build-upload-tool.js $UPLOAD_INFO_FILE
