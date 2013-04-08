Bootstrap Android
===

To install the Android Maven dependencies in your local environment, run the following:

* Clone https://github.com/mosabua/maven-android-sdk-deployer into your workstation
* Set the ANDROID_HOME environment to the location of the Android SDK, eg. `export ANDROID_HOME=/Developer/adt-bundle-mac-x86_64-20130219/sdk/`
* Run `mvn install -P 4.2` from the `maven-android-sdk-deployer` directory. The build will fail if API 17 and some extra packages are not installed.

You can then compile the bootstrap project by running

    mvn package
