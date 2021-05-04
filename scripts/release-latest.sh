#! /bin/sh

npm version $1
git push
git push --tags
npm publish --tag latest
