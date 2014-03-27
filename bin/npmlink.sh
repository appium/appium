#!/bin/bash

DEV_DIR=npmdev

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
        --master)
        MASTER=true
        shift
        ;;
        --latest)
        LATEST=true
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

function showVersion {
    echo ////////////////////////////////////////////
    echo ////////////////////////////////////////////
    echo 
    echo $1
    echo 
    echo ////////////////////////////////////////////        
    echo ////////////////////////////////////////////        
}

function npmlink {
    if [[ $MASTER ]]  || [[ $LATEST ]]; then
        GIT_URL=`node bin/npmlink latest-git-url $1`
        TAG=`node bin/npmlink latest-tag $1`
    else
        GIT_URL=`node bin/npmlink local-git-url $1`
        TAG=`node bin/npmlink local-tag $1`
    fi

    mkdir -p $DEV_DIR
    
    if [ ! -d $DEV_DIR/$1 ]; then
        git clone $GIT_URL $DEV_DIR/$1
    fi
    
    pushd $DEV_DIR/$1
    git stash
    git fetch --all
    if [[ $MASTER ]]; then
        showVersion $1@master
        git checkout master
    else
        showVersion $1@$TAG
        git checkout $TAG
    fi
    npm link
    popd
    
    npm link $1
}

if [[ $ACTION == 'usage' ]]; then
    echo 'Usage:'
    echo '  link all: dev.sh --link [--master|--latest'
    echo '  unlink all: dev.sh --unlink'
    echo '  link specific packages: dev.sh --link [--master|--latest] <pkg1> <pkg2>...'
    echo '  unlink specific packages: dev.sh --unlink <pkg1> <pkg2>...'
    echo 'Short verion:'
    echo '  link all: dev.sh -l [--master|--latest]'
    echo '  unlink all: dev.sh -u'
    echo '  link specific packages: dev.sh -l [--master|--latest] <pkg1> <pkg2>...'
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
