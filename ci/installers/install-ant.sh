#!/bin/bash
set -e

mkdir -p $HOME/tools/ant
cd $HOME/tools/ant
wget -P /tmp http://www.us.apache.org/dist/ant/binaries/apache-ant-1.9.4-bin.tar.gz
tar xzf /tmp/apache-ant-1.9.4-bin.tar.gz
echo 'export PATH=$HOME/tools/ant/apache-ant-1.9.4/bin:$PATH' > $HOME/tools/ant/env
