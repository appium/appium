npm version prerelease --preid=$1
git push
git push --tags
# Note: Do not forget to add `--tag rc` for RC channel. Without the tag, the publishment will end up in `latest`.
npm publish --tag $1
