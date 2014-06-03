#!/bin/sh
set -e

if [[ "${BZ2_FILE}" == '' ]]; then
    echo Please set the BZ2_FILE env variable!
    exit 1
fi

echo "Starting to compress and upload appium to ${BZ2_FILE}."

UPLOAD_INFO_FILE=/tmp/build-upload-info.json

# zipping/uploading
tar \
    cfj - \
    -L \
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

echo "Finished to compress and upload appium."
