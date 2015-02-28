# 部署ios app 到手机上

准备在真机上执行appium测试, 需要如下准备:

1. 用特殊的设备参数来构建app
1. 使用 [fruitstrap](https://github.com/ghughes/fruitstrap), 一个第三方程序，来部署你构建的app到手机上

## Xcodebuild 命令的参数:
新的参数运行指定设置. 参考 [developer.apple.com](https://developer.apple.com/library/mac/#documentation/Darwin/Reference/ManPages/man1/xcodebuild.1.html):

```
xcodebuild [-project projectname] [-target targetname ...]
             [-configuration configurationname] [-sdk [sdkfullpath | sdkname]]
             [buildaction ...] [setting=value ...] [-userdefault=value ...]
```

这有一个资料来参考可用的[设置](https://developer.apple.com/library/mac/#documentation/DeveloperTools/Reference/XcodeBuildSettingRef/1-Build_Setting_Reference/build_setting_ref.html#//apple_ref/doc/uid/TP40003931-CH3-DontLinkElementID_10)

```
CODE_SIGN_IDENTITY (Code Signing Identity)
    介绍: 标识符，指定一个签名.
    例如: iPhone Developer
```

PROVISIONING_PROFILE 已经从可用的的命令中消失了，但还是有必要设置的。

在xcodebuild命令中设置 "CODE_SIGN_IDENTITY" & "PROVISIONING_PROFILE":

```
xcodebuild -sdk <iphoneos> -target <target_name> -configuration <Debug> CODE_SIGN_IDENTITY="iPhone Developer: Mister Smith" PROVISIONING_PROFILE="XXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX"
```

成功的话, app会构建到如下目录 ```<app_dir>/build/<configuration>-iphoneos/<app_name>.app```

## 用Fruitstrap进行部署
clone一个fruitstrap的fork版本在[ghughes version](https://github.com/ghughes/fruitstrap) ，这个已经不再维护. 已确认该fork可用[unprompted fork](https://github.com/unprompted/fruitstrap), 但是其它的据说也可用.

clone成功的话, 执行 ``make fruitstrap``
然后, 然后复制生成的 ``fruitstrap``到app的所在的目录或上级目录下。

运行fruitstrap 通过输入以下命令 (命令是否可用依赖于你fork的 fruitstrap):

```
./fruitstrap -d -b <PATH_TO_APP> -i <Device_UDID>
```

如果是为了持续集成,你可以发现很有用的方法来记录fruitstrap命令行和日志文件中的记录, 像这样:

```
./fruitstrap -d -b <PATH_TO_APP> -i <Device_UDID> 2>&1 | tee fruit.out
```

在node服务启动前fruitstrap进行需要被结束, 一个方法是扫描fruitstrap的输出来得知app完成启动。 有一个有效的方法是通过一个Rakefile 和一个 ``go_device.sh`` 脚本:

```
bundle exec rake ci:fruit_deploy_app | while read line ; do 
   echo "$line" | grep "text to identify successful launch" 
   if [ $? = 0 ] 
   then 
   # Actions 
       echo "App finished launching: $line" 
       sleep 5 
       kill -9 `ps -aef | grep fruitstrap | grep -v grep | awk '{print $2}'` 
   fi
 done
```

一旦fruitstrap的进程被结束, node 服务就可以启动并且appium测试可以被执行!

下一步:
[在真机上运行appium](https://github.com/appium/appium/wiki/Running-Appium-on-Real-Devices)
