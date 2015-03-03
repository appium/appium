搭建iOS运行环境

为了避免启动iOS apps时弹出安全警告，你可以通过以下两种方法修改/etc/authorization文件：
1.手动将/etc/authorization文件中<allow-root>下的<key>system.privilege.taskport</key>改为<true/>
2.运行以下grunt命令来自动修改/etc/authorization文件
sudo ./bin/authorize-ios.js

然后再运行以下命令：
./reset.sh --ios --dev

现在你的appium实例已经准备就绪，运行node.来启动appium server.

搭建android运行环境

Bootstrap通过运行以下命令来启动android：
./reset.sh --android --dev

如果你想运行Selendroid来支持像2.3这样的旧的android平台，运行以下命令：
./reset.sh --selendroid --dev

确保你有且只有一个Android模拟器或者真机在运行，举个例子，在其它的设备上运行此命令（假设emulator命令已经在你的path中了）需执行：
emulator -avd <MyAvdName>

确保更新到最新版本
由于Appium使用一些包的开发版本，所以经常安装新的npm包和升级不同的包是很有必要的。以下命令可以将所有平台上的包进行更新（--dev标志会获取npm dev依赖和Appium测试套件中用到的应用程序）
./reset.sh --dev
或者你可以为单独的平台运行reset命令：
./reset.sh --ios --dev
./reset.sh --android --dev
./reset.sh --selendroid --dev