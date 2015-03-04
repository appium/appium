##从源码运行Appium

你想要从源码运行Appium并帮助修复bug和添加新的特性么？很好！fork这个项目，做一点更改，并且发送一个请求吧！
另外，在工作之前请先看下我们的代码风格指南。请在发送请求前，确保单元测试与功能测试都测试通过；
关于如何运行测试的更多信息，请继续阅读!
首先确保你阅读并遵循README中的安装说明。

###从源码配置Appium

Appium的安装，包含在你的测试代码与设备/模拟器之间来回发送消息的Appium服务端，和一个用任和存在且兼容Appium的语言编写的测试脚本。
运行一个Appium服务器实例，然后进行你的测试。

快速开始的方式：

```center
$ git clone https://github.com/appium/appium.git
$ cd appium
$ ./reset.sh
$ sudo ./bin/authorize-ios.js # for ios only
$ node .
```

### Appium 开发环境搭建

确保你安装了ant,maven,adb并且将他们加入到了系统环境变量PATH中,与此同时你还需要安装android-16 sdk(Selendroid)和android-19 sdk. 
从你本地仓库的命令行提示，使用下边的命令安装如下包（如果你没有使用homebrew包管理器安装node ，则你可能不得不使用sudo 权限运行npm）:

```center
npm install -g mocha
npm install -g grunt-cli
node bin/appium-doctor.js --dev
./reset.sh --dev
```

前两个命令安装测试和构建工具（如果你已经通过homebrew包管理器安装了node.js就不需要sudo了）.
第三个命令验证所有的依赖关系是否设置正确（由于依赖关系构建Appium不同于简单的运行Appium）,
第四个命令安装所有程序依赖关系和构建支持二进制文件和测试应用程序。
reset.sh也是建议先从master上pull下改变后的内容再执行命令。
运行reset.sh 加上--dev 标志同时安装git hooks以确保代码质量在提交时是被保存过的。
此时，你可以启动Appium 服务:

```center
node .
```

查看完整的服务文档参数列表[the server documentation](/docs/en/writing-running-appium/server-args.md)

像自动化开发任务的能力？查看Appium Grunt tasks可以帮助构建[Appium Grunt tasks](/docs/en/contributing-to-appium/grunt.md)应用程序,安装程序,生成文档,等等。

#### 搭建iOS运行环境

为了避免启动iOS apps时弹出安全警告，你可以通过以下两种方法修改/etc/authorization文件：

1. Manually modify the element following `<allow-root>` under `<key>system.privilege.taskport</key>`
   in your `/etc/authorization` file to `<true/>`.
1. 手动将`/etc/authorization`文件中`<allow-root>`下的`<key>system.privilege.taskport</key>`改为`<true/>`

2. 运行以下grunt命令来自动修改`/etc/authorization`文件:

    ```center
    sudo ./bin/authorize-ios.js
    ```

然后再运行以下命令：

```center
./reset.sh --ios --dev
```

现在你的appium实例已经准备就绪，运行`node .`.来启动appium server.

#### 搭建android运行环境

Bootstrap通过运行以下命令来启动android：

```center
./reset.sh --android --dev
```

如果你想运行[Selendroid](http://github.com/DominikDary/selendroid) 来支持像2.3这样的旧的android平台，运行以下命令：

```center
./reset.sh --selendroid --dev
```

确保你有且只有一个Android模拟器或者真机在运行，举个例子，在其它的设备上运行此命令（假设`emulator`命令已经在你的path中了）需执行：

```center
emulator -avd <MyAvdName>
```

现在你已经可以通过运行`node .`来启动Appium服务了。

#### 确保更新到最新版本


由于Appium使用一些dev版本的包，所以经常安装新的`npm`包和升级不同的包是很有必要的。
以下命令可以将所有平台上的包进行更新（`--dev`标志会获取npm dev依赖和Appium测试套件中用到的应用程序）:

```center
./reset.sh --dev
```

或者你可以为单独的平台运行reset命令

```center
./reset.sh --ios --dev
./reset.sh --android --dev
./reset.sh --selendroid --dev
```

### 运行测试集
首先，看看我们的文档[一般运行测试情况下](/docs/en/writing-running-appium/running-tests.md) 
然后，确保你的环境在对应的平台上已经搭建好了与你所期望的那样

当你的环境搭建好了之后并且你的代码是最新的，你可以通过以下的方式来运行单元测试:

```center
grunt unit
```
你可以在所支持的平台上运行一些功能测试（确保后Appium用`node .`在另外一个窗口中运行）

```center
bin/test.sh
```
或者你可以运行`test.sh`特定平台上的测试

```center
bin/test.sh --android
bin/test.sh --ios
bin/test.sh --ios7
bin/test.sh --ios71
```
在提交代码时，请运行`grunt`执行一些基本的测试和核对代码质量标准的更改，请注意，这可能会自动发生的，
如果你已经运行`reset.sh --dev`，这于你预先提交代码的操作所关联起来的。

```center
grunt lint
> Running "newer:jshint" (newer) task
> 
> Running "newer:jshint:files" (newer) task
> No newer files to process.
> 
> Running "newer:jshint:test" (newer) task
> No newer files to process.
> 
> Running "newer:jshint:examples" (newer) task
> No newer files to process.
> 
> Running "jscs:files" (jscs) task
> >> 303 files without code style errors.
```

#### 运行单独的测试
如果你有一个Appium服务监听，你可以通过Mocha来运行单独的测试文件,例如：


```center
DEVICE=ios71 mocha -t 60000 -R spec test/functional/ios/testapp/simple.js
```
或许单独的测试集（例如，一个测试用”alert"在名称的单词）


```center
DEVICE=ios6 mocha -t 60000 -R spec --grep "alert" test/functional/ios/uicatalog
```

对于windows操作系统，你可以用`set DEVICE=android` 在cmd命令行的方式中运行以上所有测试集，例如：


```center
set DEVICE=android
mocha -t 60000 -R spec test/functional/android/apidemos/alerts-specs.js
```

注意：对于安卓系统，你将需要一个e mulator/device 4.0的屏幕大小模拟器(480x800)，有些测试集可能会失败在
不同的屏幕大小下。

`DEVICE`必须设置为一个有效的值:`ios71`, `ios6`, `android`, `selendroid`

