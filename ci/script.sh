#!/bin/bash
set +e

export SUDO_UID=0

source ./ci/env
./ci/show-env.sh

if [[ $CI_CONFIG == 'unit' ]]; then
    npm test
elif [[ $CI_CONFIG == 'build' ]]; then
    ./reset.sh --hardcore --dev --ios --android --selendroid --gappium --verbose 
fi
