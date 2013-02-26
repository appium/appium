If you want to build android bootstrap, here's how it works:

* make sure `$ANDROID_HOME` is set to your android sdk
* in `uiautomator/bootstrap`:
    $ANDROID_HOME/tools/android create uitest-project -n AppiumBootstrap -t
    android-17 -p .
* (replace "1" with whatever Android target you want to use)
    ant build
* this will build AppiumBootstrap.jar in bin/
