## Deploying an iOS app to a real device

To prepare for your Appium tests to run on a real device, you will need to:

1. Build your app with specific device-targeted parameters
2. Use [ideviceinstaller](https://github.com/libimobiledevice/ideviceinstaller), a 3rd-party tool,
 to deploy this build to your device

### Xcodebuild with parameters:
A newer xcodebuild now allows settings to be specified. Taken from [developer.apple.com](https://developer.apple.com/library/mac/#documentation/Darwin/Reference/ManPages/man1/xcodebuild.1.html):

```center
xcodebuild [-project projectname] [-target targetname ...]
             [-configuration configurationname] [-sdk [sdkfullpath | sdkname]]
             [buildaction ...] [setting=value ...] [-userdefault=value ...]
```

This is a resource to explore the available [settings](https://developer.apple.com/library/mac/#documentation/DeveloperTools/Reference/XcodeBuildSettingRef/1-Build_Setting_Reference/build_setting_ref.html#//apple_ref/doc/uid/TP40003931-CH3-DontLinkElementID_10)

```center
CODE_SIGN_IDENTITY (Code Signing Identity)
    Description: Identifier. Specifies the name of a code signing identity.
    Example value: iPhone Developer
```

PROVISIONING_PROFILE is missing from the index of available commands,
but may be necessary.

Specify "CODE_SIGN_IDENTITY" & "PROVISIONING_PROFILE" settings in the
xcodebuild command:

```center
xcodebuild -sdk <iphoneos> -target <target_name> -configuration <Debug> CODE_SIGN_IDENTITY="iPhone Developer: Mister Smith" PROVISIONING_PROFILE="XXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
```

On success, the app will be built to your ```<app_dir>/build/<configuration>-iphoneos/<app_name>.app```

### Deploy using ideviceinstaller

To install the latest tagged version of the ideviceinstaller using
Homebrew, run the following commands in the terminal:

 ``` center
 # The first command is only required if you don't have brew installed.
 > ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
 > brew update
 > brew install ideviceinstaller
 > ideviceinstaller -u <UDID of device> -i <path of .app/.ipa>
 ```

Next: [Running Appium on Real Devices](real-devices.md)
