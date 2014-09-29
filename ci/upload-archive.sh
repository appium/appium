#!/bin/bash
set -e

source ./ci/env.sh

if [[ "${TARBALL}" == '' ]]; then
    echo Please set the TARBALL env variable!
    exit 1
fi

SOURCE=/tmp/${TARBALL}

echo "Starting to upload appium from ${SOURCE} to ${TARBALL}."

UPLOAD_INFO_FILE=./build-upload-info.json

# zipping/uploading
curl \
    -k \
    --silent \
    -u $SAUCE_USERNAME:$SAUCE_ACCESS_KEY \
    -X POST "${SAUCE_REST_ROOT}/storage/${SAUCE_USERNAME}/${TARBALL}?overwrite=true" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @${SOURCE} \
    -o $UPLOAD_INFO_FILE

    # --progress-bar \

# checking/printing result file
ci/tools/build-upload-tool.js $UPLOAD_INFO_FILE
rm ${SOURCE}
echo "Finished to compress and upload appium."
