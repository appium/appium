#!/bin/bash
set -e
git config --global user.email "appium-ci@appium.io"
git config --global user.name "appium-ci"
PUSH_URL=$(git config --get remote.origin.url | sed s/git:/https:/)
echo "https://${GH_TOKEN}:@github.com" > ${HOME}/.git-credentials
git config credential.helper "store --file=${HOME}/.git-credentials"
git remote set-url --push origin ${PUSH_URL}
git config --global push.default simple
