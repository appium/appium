#!/bin/bash

SC_DIR="/tmp/sc"
READY_FILE="sc-ready-$RANDOM"

mkdir -p $SC_DIR && cd $SC_DIR
touch $SC_DIR/sauce_connect.log

source $HOME/tools/sc/env

sc \
    -u $SAUCE_USERNAME \
    -k $SAUCE_ACCESS_KEY \
    --readyfile $READY_FILE\
    --tunnel-identifier $TRAVIS_JOB_NUMBER \
    -l $SC_DIR/sauce_connect.log \
    &> /dev/null &

echo 'waiting for sauce connect to start'
tail -f $SC_DIR/sauce_connect.log &

# Wait for Connect to be ready before exiting
while [ ! -f $READY_FILE ]; do
  sleep .5
done
