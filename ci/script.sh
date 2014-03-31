#!/bin/bash
set +e

unset SUDO_UID

source ./ci/env
./ci/show-env.sh

if [[ $CI_CONFIG == 'unit' ]]; then
    npm test
elif [[ $CI_CONFIG == 'build' ]]; then
    ./reset.sh --hardcore --dev --ios --android --selendroid --gappium --verbose 
    ./ci/upload_build_to_sauce.sh    
fi
