#!/bin/bash
set -e

mkdir -p $HOME/tools/sc
cd $HOME/tools/sc
wget -P /tmp https://saucelabs.com/downloads/sc-4.3-osx.zip
unzip /tmp/sc-4.3-osx.zip -d $HOME/tools/sc
echo 'export PATH=$HOME/tools/sc/sc-4.3-osx/bin:$PATH' > $HOME/tools/sc/env
