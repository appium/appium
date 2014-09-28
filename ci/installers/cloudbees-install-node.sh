# Needs to be sourced!

set -e

curl -s -o use-node https://repository-cloudbees.forge.cloudbees.com/distributions/ci-addons/node/use-node
NODE_VERSION=0.10.26 . ./use-node
