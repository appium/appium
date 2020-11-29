npm version prerelease --preid=$1
git push
git push --tags
npm publish --tag $1
