# Appium在真机上

Appium已经初步支持真机测试。

如果要在真机上执行测试，你将要做如下准备：

1.一个苹果的开发者ID和有效的开发者对应的配置文件和签名文件

2.一台iPad或者iPhone

3. 你要测试的应用的源码

4. 一台安装了XCode和XCode Command Line Developer Tools的Mac机器 

## Provisioning Profile

要在真机上测试就需要一个有效的iOS开发者的Distribution Certificate and Provisioning Profile。你可以在这个上面找到配置这些的相关信息[Apple documentation](http://developer.apple.com/library/ios/#documentation/ToolsLanguages/Conceptual/YourFirstAppStoreSubmission/TestYourApponManyDevicesandiOSVersions/TestYourApponManyDevicesandiOSVersions.html)

同样的，你还需要对你的应用签名，更多的信息可以查看[sign your app](http://developer.apple.com/library/ios/#documentation/ToolsLanguages/Conceptual/YourFirstAppStoreSubmission/ProvisionYourDevicesforDevelopment/ProvisionYourDevicesforDevelopment.html#//apple_ref/doc/uid/TP40011375-CH4-SW1).

你必须使用Xcode的执行按钮来安装你的应用

## 使用Appium运行你的测试

一旦你的设备和应用设置好了之后，你就能够用如下的命令在你的机器上执行测试：

```
node . -U <UDID> --app <bundle_id>
```

这将会启动Appium并且开始在真机上测试应用。

## 疑问解答思路

0. 确认UDID已经正确的在xcode organizar或itunes中设置了。很长的字符串（20多个字符串）
0.确认你测试代码中的测试对象设备的设置
0. 再次确认你从instruments启动你的自动化测试
0. 确认instruments已经关闭
