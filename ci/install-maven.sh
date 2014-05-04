#!/bin/bash
set +e

mkdir -p $HOME/tools/maven
cd $HOME/tools/maven
wget -P /tmp http://apache.cdpa.nsysu.edu.tw/maven/maven-3/3.1.1/binaries/apache-maven-3.1.1-bin.tar.gz
tar xzf /tmp/apache-maven-3.1.1-bin.tar.gz
echo 'export PATH=$HOME/tools/maven/apache-maven-3.1.1/bin:$PATH' > $HOME/tools/maven/env
