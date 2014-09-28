#!/bin/sh
set -e

if [[ "${TARBALL}" == '' ]]; then
    echo Please set the TARBALL env variable!
    exit 1
fi

echo "Starting to compress and upload appium to ${TARBALL}."

UPLOAD_INFO_FILE=/tmp/build-upload-info.json

# zipping/uploading
tar \
    cfj - \
    -L \
    --exclude=.git \
    --exclude=submodules . | \
curl \
    -k \
    --silent \
    -u $SAUCE_USERNAME:$SAUCE_ACCESS_KEY \
    -X POST "${SAUCE_REST_ROOT}/storage/${SAUCE_USERNAME}/${TARBALL}?overwrite=true" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @- \
    -o $UPLOAD_INFO_FILE

    # --progress-bar \

# checking/printing result file
ci/tools/build-upload-tool.js $UPLOAD_INFO_FILE

echo "Finished to compress and upload appium."
