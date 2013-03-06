echo "Resetting Appium"
echo "Clearing dev version of WD"
rm -rf node_modules/wd
echo "Installing WD and new NPM modules"
npm install .
echo "Building Android bootstrap"
grunt configAndroidBootstrap
grunt buildAndroidBootstrap
echo "Rebuilding test apps"
grunt buildApp:TestApp
grunt buildApp:UICatalog
grunt buildApp:WebViewApp
echo "Cleaning temp files"
rm -rf /tmp/instruments_sock
rm -rf *.trace
