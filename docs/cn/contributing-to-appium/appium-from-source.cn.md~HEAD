##从源码运行Appium

你想要从源码运行 Appium 并帮助修复 bug 和添加新的特性么？很好！ fork 这个项目，做一点更改，并且发送一个请求吧！
另外，在工作之前请先看下我们的[代码风格指南](style-guide.cn.md)。请在发送请求前，确保单元测试与功能测试都测试通过；
关于如何运行测试的更多信息，请继续阅读!
首先确保你阅读并遵循 README 中的安装说明。

###从源码配置Appium

Appium 的安装，包含在你的测试代码与设备/模拟器之间来回发送消息的 Appium 服务端，和一个用任何存在且兼容Appium的语言编写的测试脚本。
运行一个 Appium 服务器实例，然后进行你的测试。

快速开始的方式：

```center
$ git clone https://github.com/appium/appium.git
$ cd appium
$ ./reset.sh
$ sudo ./bin/authorize-ios.js # for ios only
$ node .
```

### Appium 开发环境搭建

确保你安装了 ant，maven，adb 并且将他们加入到了系统环境变量 PATH 中,与此同时你还需要安装 android-16 sdk(Selendroid) 和android-19 sdk。
从你本地仓库的命令行提示，使用下边的命令安装如下包（如果你没有使用homebrew包管理器安装 `node`，则你可能不得不使用 sudo 权限运行npm）:

```center
npm install -g mocha
npm install -g grunt-cli
node bin/appium-doctor.js --dev
./reset.sh --dev
```

前两个命令安装测试和构建工具（如果你已经通过 Homebrew 包管理器安装了 node.js 就不需要 `sudo` 了）。
第三个命令验证所有的依赖关系是否设置正确（由于依赖关系构建 Appium 不同于简单的运行 Appium ），
第四个命令安装所有程序依赖关系和构建支持二进制文件和测试应用程序。
`reset.sh` 也是建议先从 master 上 pull 下改变后的内容再执行命令。
运行 `reset.sh` 加上 `--dev` 标志同时安装 git hooks 以确保代码质量在提交时是被保存过的。
此时，你可以启动 Appium 服务:

```center
node .
```

查看完整的服务文档参数列表[the server documentation](/docs/cn/writing-running-appium/server-args.cn.md)

想要实现任务自动化，请检出[Appium Grunt tasks](/docs/cn/contributing-to-appium/grunt.cn.md)来构建应用程序，安装程序，生成文档，等等。


#### 搭建iOS运行环境

为了避免启动 iOS apps 时弹出安全警告，你可以通过以下两种方法修改 /etc/authorization 文件：

1. 手动将 `/etc/authorization` 文件中 `<key>system.privilege.taskport<key/>` 下紧跟 `<allow-root>` 的元素改成 `<true/>`。


2. 运行以下grunt命令来自动修改 `/etc/authorization` 文件:

    ```center
    sudo ./bin/authorize-ios.js
    ```

然后再运行以下命令：

```center
./reset.sh --ios --dev
```

现在你的 appium 实例已经准备就绪，运行 `node .` 来启动 appium server. 

#### 搭建android运行环境

Bootstrap 通过运行以下命令来启动 android：

```center
./reset.sh --android --dev
```

如果你想运行[Selendroid](http://github.com/DominikDary/selendroid) 来支持2.3这样的旧的android平台，运行以下命令：

```center
./reset.sh --selendroid --dev
```

确保你有且只有一个 Android 模拟器或者真机在运行，举个例子，在其它的设备上运行此命令（假设 `emulator` 命令已经在你的 path 中了）需执行：


```center
emulator -avd <MyAvdName>
```

现在你可以通过 `node .` 启动 Appium server 了。

#### 确保更新到最新版本

由于 Appium 使用一些包的开发版本，所以经常安装新的 `npm` 包和升级不同的包是很有必要的。以下命令可以将所有平台上的包进行更新（ `--dev` 标志会获取 npm dev 依赖和 Appium 测试套件中用到的应用程序）。当Appium提示版本更新时，你也可以用以下命令来更新：


```center
./reset.sh --dev
```

或者你可以只更新指定的平台：

```center
./reset.sh --ios --dev
./reset.sh --android --dev
./reset.sh --selendroid --dev
```

### 运行测试集
首先，看看我们的文档[普通情况下执行测试](/docs/cn/writing-running-appium/running-tests.cn.md) ，
然后确保你的环境在对应的平台上已经搭建好了且与你所期望的那样。

当你的环境搭建好了之后并且你的代码是最新的，你可以通过以下的方式来运行单元测试:

```center
grunt unit
```
你可以在所支持的平台上运行一些功能测试（确保后 Appium 用 `node .` 在另外一个窗口中运行）：

```center
bin/test.sh
```

或者你可以通过运行 `test.sh` 来对指定的平台环境进行测试:

```center
bin/test.sh --android
bin/test.sh --ios
bin/test.sh --ios7
bin/test.sh --ios71
```
在提交代码时，请运行 `grunt` 执行一些基本的测试和核对代码质量标准的更改，请注意，这可能会自动发生的，
如果你已经运行 `reset.sh --dev` ，这于你预先提交代码的操作所关联起来的。

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
如果你有一个 Appium 服务监听，你可以通过 Mocha 来运行单独的测试文件，例如：

```center
DEVICE=ios71 mocha -t 60000 -R spec test/functional/ios/testapp/simple.js
```
或者单独的测试集（例如，测试名称中的单词 "alert" ）


```center
DEVICE=ios6 mocha -t 60000 -R spec --grep "alert" test/functional/ios/uicatalog
```

对于 windows 操作系统，你可以用 `set DEVICE=android` 在 cmd 命令行的方式中运行以上所有测试集，例如：


```center
set DEVICE=android
mocha -t 60000 -R spec test/functional/android/apidemos/alerts-specs.js
```

注意：对于安卓系统，你将需要一个屏幕大小为4.0（400x800）的模拟器/设备（emulator/device），有些测试集在不同的屏幕大小下可能会失败。

`DEVICE` 必须设置为一个有效的值:`ios71`, `ios6`, `android`, `selendroid`

