plist_path=$1/Contents/Developer/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk/Developer/Library/LaunchDaemons/com.apple.instruments.deviceservice.plist
iwd_path=$2/node_modules/appium_instruments/thridparty/iwd7
/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables dict" $plist_path
/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:DYLD_INSERT_LIBRARIES string $iwd_path/DTMobileISShim.dylib" $plist_path
/usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:LIB_PATH string $iwd_path/" $plist_path

