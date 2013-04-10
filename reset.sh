echo "Resetting / Initializing Appium"
echo "Clearing dev version of WD"
set +e  # we expect next command might fail without sudo privs
rm -rf node_modules/wd
rm_status=$?
set -e  # turn error checking back on so we can exit if sudo branch doesn't work
if [ $rm_status -gt 0 ]; then
    echo "rm failed. Trying again with sudo."
    sudo rm -rf node_modules/wd
fi
echo "Installing WD and new NPM modules"
set +e
npm install .
install_status=$?
set -e
if [ $install_status -gt 0 ]; then
    echo "install failed. Trying again with sudo."
    sudo npm install .
fi
echo "Downloading/updating instruments-without-delay"
git submodule update --init submodules/instruments-without-delay
echo "Building instruments-without-delay"
pushd submodules/instruments-without-delay
./build.sh
popd
echo "Downloading/updating AndroidApiDemos"
git submodule update --init submodules/ApiDemos
rm -rf sample-code/apps/ApiDemos
ln -s $(pwd)/submodules/ApiDemos $(pwd)/sample-code/apps/ApiDemos
echo "Building Android bootstrap"
grunt configAndroidBootstrap
grunt buildAndroidBootstrap
if [ ! -d "./sample-code/apps/UICatalog" ]; then
    echo "Downloading UICatalog app"
    grunt downloadApp
fi
echo "Rebuilding test apps"
grunt buildApp:TestApp
grunt buildApp:UICatalog
grunt buildApp:WebViewApp
grunt configAndroidApp:ApiDemos
grunt buildAndroidApp:ApiDemos
echo "Cleaning temp files"
rm -rf /tmp/instruments_sock
rm -rf *.trace
