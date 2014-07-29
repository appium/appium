Bootstrap Android
===

To install the Android Maven dependencies in your local environment, run the following:

* Clone https://github.com/mosabua/maven-android-sdk-deployer into your workstation
* Set the ANDROID_HOME environment to the location of the Android SDK, eg. `export ANDROID_HOME=/Developer/adt-bundle-mac-x86_64-20130219/sdk/`
* Run `mvn install -P 4.4` from the `maven-android-sdk-deployer` directory. The build will fail if API 19 and some extra packages are not installed.
* Please install all sdk and api versions of android for building `maven-android-sdk-deployer`.

You can then compile the bootstrap project by running

    mvn package -P 4.4

If mvn package fails, try deleting your ANDROID_HOME folder and downloading everything again. If it still doesn't work try:

    android-sdk/tools/android update sdk --no-ui --obsolete --force

and then run `mvn clean ; mvn install`
