#!/bin/sh
GIT_COMMIT=git rev-parse --short HEAD 2> /dev/null | sed "s/\(.*\)/\1/"
tar cfj - --exclude=node_modules --exclude=submodules . | \
curl \
    --verbose \
    --progress-bar \
    -u $SAUCE_USERNAME:$SAUCE_ACCESS_KEY \
    -X POST "https://saucelabs.com/rest/v1/storage/${SAUCE_USERNAME}/appium-dev-$(GIT_COMMIT).bjz?overwrite=true" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @- > /tmp/curl.out
cat /tmp/curl.out
