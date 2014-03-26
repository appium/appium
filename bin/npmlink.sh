#!/bin/bash

ACTION='usage'

ALL_PACKAGES=(
    'appium-atoms'
    'appium-instruments'
    'appium-uiauto'
)

PACKAGES=()

for i in "$@"
do
    case $i in
        -l|--link)
        ACTION='link'
        shift
        ;;
        -u|--unlink)
        ACTION='unlink'
        shift
        ;;
        -m|--master)
        MASTER=true
        shift
        ;;
        *)
          PACKAGES+=($i)
          shift
        ;;
    esac
done

if [[ ${#PACKAGES[*]} == 0 ]]; then
    PACKAGES=("${ALL_PACKAGES[@]}")
fi

function npmlink {
    GIT_URL=`node bin/npmlink git-url $1`
    LIVE_TAG=`node bin/npmlink live-tag $1`

    mkdir -p npmdev
    
    if [ ! -d npmdev/$1 ]; then
        git clone $GIT_URL npmdev/$1
    fi
    
    pushd npmdev/$1
    git stash
    git fetch --all
    if [[ $MASTER ]]; then
        git checkout master
    else
        git checkout $LIVE_TAG
    fi
    npm link
    popd
    
    npm link $1
}

if [[ $ACTION == 'usage' ]]; then
    echo 'Usage:'
    echo '  link all: dev.sh --link [--master]'
    echo '  unlink all: dev.sh --unlink'
    echo '  link specific packages: dev.sh --link [--master] <pkg1> <pkg2>...'
    echo '  unlink specific packages: dev.sh --unlink <pkg1> <pkg2>...'
    echo 'Short verion:'
    echo '  link all: dev.sh -l [-m]'
    echo '  unlink all: dev.sh -u'
    echo '  link specific packages: dev.sh -l [-m] <pkg1> <pkg2>...'
    echo '  unlink specific packages: dev.sh -u <pkg1> <pkg2>...'
fi

if [[ $ACTION == 'link' ]]; then
    for i in "${PACKAGES[@]}"
    do
        npmlink $i
    done
fi

if [[ $ACTION == 'unlink' ]]; then
    for i in "${PACKAGES[@]}"
    do
        npm unlink $i
        npm install $i
    done
fi
