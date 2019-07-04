## 从源码运行Appium

你想从源码运行Appium并帮助修复BUG和添加功能吗？
真棒！只需要fork工程，添加一个修改，然后发送pull请求即可！
在开始之前请阅读我们的代码风格指南（[Style Guide](style-guide.md)。
在发送pull请求前请确保通过单元和功能测试；关于如何运行测试等更多信息，请继续阅读！

首先，确保你阅读README文件且按照设置说明走。

### 从源码配置 Appium

Appium 的配置涉及：

1. Appium Server —— 在你的测试代码和设备或模拟器之间通过 Appium Server 来回发送消息
2. 测试脚本 —— 任何客户端语言都可以，只要和 Appium 兼容

运行 Appium Server，然后运行你的测试。

快速开始：

```center
git clone https://github.com/appium/appium.git
cd appium
npm install
npm run build
npm run authorize-ios                # for ios only
node .
```
```center
git clone https://github.com/appium/appium.git
cd appium
npm install
npm run build # 需要gulp，往下看
npm run authorize-ios                # 仅iOS
node .
```

### 捣鼓改造 Appium

Make sure you have `ant`, `maven`, `adb` installed and added to system `PATH`, also you
would need the android-16 sdk (for Selendroid) and android-19 sdk installed.
From your local repo's command prompt, install the following packages using the
following commands (if you didn't install `node` using Homebrew, you might have
to run `npm` with sudo privileges):


确保已安装 `ant`、 `maven`、 `adb` 且已添加到 `PATH` 环境变量，还需要安装 android-16 的 sdk（Selendroid需要使用）和 android-19 的 sdk。在 Appium 本地仓库打开命令行，使用以下命令安装以下包（如果你没有使用Homebrew安装过 node，可能需要使用 sudo 运行 npm）：

```center
npm install -g appium-doctor && appium-doctor --dev
npm install
gulp transpile
```

前两个命令安装测试和构建工具（如果您通过 Homebrew 安装了 nodejs，则 `sudo` 可能不是必需的）。 第三个命令验证所有依赖关系是否正确设置（因为构建 Appium 的依赖关系不同于简单运行 Appium 的依赖项），而第四个命令将安装所有应用程序依赖关系并构建支持二进制文件和测试应用程序。 最终的命令将转换所有代码，以便 nodejs 可以运行它。


When pulling new code from GitHub, if there are changes to `package.json` it
is necessary to remove the old dependencies and re-run `npm install`:

当从 GitHub 中拉出新的代码时，如果 `package.json` 有更改，需要删除旧的依赖关系并重新运行 `npm install`：

```center
rm -rf node_modules
npm install
npm run build
```

此时，您将可以启动 Appium Server：

```center
node .
```

完整的参数列表，请参考[the server documentation](/docs/cn/writing-running-appium/server-args.md)


#### Hacking with Appium for iOS

#### 鼓捣 iOS 上的Appium

为了避免启动iOS应用程序时可能出现的安全对话框，您必须通过以下两种方式之一修改 `/etc/authorization` 文件：

1. 手动修改 `/etc/authorization` 文件中的 `<key>system.privilege.taskport</key>` 下的 `<allow-root>`的值为 `<true/>`。
2. 运行以下命令，为您自动修改 `/etc/authorization` 文件：

    ```center
    sudo npm run authorize-ios
	```


此时，运行：

```center
rm -rf node-modules
npm install
npm run build
```

现在你的 Appium 实例已经准备好了。运行 `node .` 以启动Appium服务器。

#### 鼓捣 Android 上的Appium

通过运行以下命令配置Appium：

```center
rm -rf node-modules
npm install
npm run build
```

确保您只有一个 Android 模拟器或设备运行，例如，通过在另一个进程中运行此命令（假设 `emulator` 命令在您的路径上）：

```center
emulator -avd <MyAvdName>
```

现在，您可以通过 `node .` 运行Appium服务器了。

#### 确保你的代码是最新的

由于Appium使用某些软件包的开发版本，因此通常需要安装新 `npm` 软件包或更新各种软件。运行 `npm install` 将更新所需的一切。当 Appium 升级版本时，您还需要执行此操作。在运行 `npm install` 之前，建议先删除 `node_modules` 目录中的所有旧依赖项：

```center
rm -rf node-modules
npm install
npm run build
```

### 运行测试

首先，请查看我们关于[running tests in
general](/docs/cn/writing-running-appium/running-tests.md) 的文档，确保您的系统正确设置为您希望测试的平台。

一旦您的系统配置完毕，您的代码是最新的，您可以运行单元测试：

```center
npm run test
```

您可以对所有受支持的平台运行功能测试（确保在另一个窗口中运行Appium `node .`）与：

```center
npm run e2e-test
```

在提交代码之前，请运行 `npm run test` 一些基本测试，并根据代码质量标准检查您的更改。

本文由 [校长](https://testerhome.com/xushizhao) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
