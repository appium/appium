#!/bin/sh
set -e

CI_BRANCH=ci-${BRANCH_CAT}-${TRAVIS_BRANCH}
UPLOAD_INFO_FILE=ci/build-upload-info.json


# preparing test branch
git branch -f ${CI_BRANCH}
git checkout ${CI_BRANCH}
cp .travis.yml .travis.yml.master
node ci/tools/travis-yml-tool.js .travis.yml.master ci/travis-functional.yml > .travis.yml
git add ${UPLOAD_INFO_FILE} .travis.yml.master ci/test-split.json
git commit -a -m "ci ${BRANCH_CAT} branch for build #${TRAVIS_JOB_NUMBER}"

# pushing
git push -f origin ${CI_BRANCH}:${CI_BRANCH}
