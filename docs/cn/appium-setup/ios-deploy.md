## 在真机上部署 iOS 应用

准备在真机上运行 Appium 之前，你需要做好以下几件事：

1. 使用特定设备相关的参数去构建你的 app
2. 使用第三方工具 [ideviceinstaller](https://github.com/libimobiledevice/ideviceinstaller) 将你构建的包部署到你的设备上 

### Xcodebuild 的参数：

现在新版的 xcodebuild 允许使用的指定设置。请参考[developer.apple.com](https://developer.apple.com/library/mac/#documentation/Darwin/Reference/ManPages/man1/xcodebuild.1.html):

```center
xcodebuild [-project projectname] [-target targetname ...]
             [-configuration configurationname] [-sdk [sdkfullpath | sdkname]]
             [buildaction ...] [setting=value ...] [-userdefault=value ...]
```

在这资料中你会发现一些有用的 [设置](https://developer.apple.com/library/mac/#documentation/DeveloperTools/Reference/XcodeBuildSettingRef/1-Build_Setting_Reference/build_setting_ref.html#//apple_ref/doc/uid/TP40003931-CH3-DontLinkElementID_10)

```center
CODE_SIGN_IDENTITY (代码签名标识)
描述: 指定代码签名标识的名称.
示例值: iPhone Developer

```

PROVISIONING_PROFILE 虽然在可用的命令列表中移除了，但还是有必要设置的。

在 xcodebuild 命令中指定 "CODE_SIGN_IDENTITY" 与 "PROVISIONING_PROFILE" 的设置：

```center
xcodebuild -sdk <iphoneos> -target <target_name> -configuration <Debug> CODE_SIGN_IDENTITY="iPhone Developer: Mister Smith" PROVISIONING_PROFILE="XXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
```

一旦成功，app 就会被构建到 `<app_dir>/build/<configuration>-iphoneos/<app_name>.app` 目录下。

### 使用 ideviceinstaller 部署

使用 Homebrew 去安装被标记为最新版本的 ideviceinstaller 工具，在终端运行以下命令：

``` center
# 第一行命令只是在你没有安装好 brew 的情况下才需要执行
> ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
> brew update
> brew install ideviceinstaller
> ideviceinstaller -u <UDID of device> -i <path of .app/.ipa>
```

下一部分：[在真机上运行 Appium](real-devices.md)

本文由 [thanksdanny](https://testerhome.com/thanksdanny) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
