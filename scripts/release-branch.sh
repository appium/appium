git fetch
echo "* Creating release branch $1"
git checkout -b releases/$1
rm -rf node_modules/ npm-shrinkwrap.json package-lock.json
npm install
npm shrinkwrap
echo "* git add ."
git add npm-shrinkwrap.json package.json
git commit -m 'add shrinkwrap'
echo "* npm version $1.0-rc.0"
npm version $1.0-rc.0
git push origin releases/$1
bash ./scripts/release-candidate.sh
