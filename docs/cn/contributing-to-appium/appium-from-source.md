## Running Appium from Source
## 从源码运行Appium

So you want to run Appium from source and help fix bugs and add features?
Great! Just fork the project, make a change, and send a pull request! Please
have a look at our [Style Guide](style-guide-2.0.md) before getting to work.
Please make sure the unit and functional tests pass before sending a pull
request; for more information on how to run tests, keep reading!
你想从源码运行Appium，帮助修复BUG和添加功能吗？
真棒！只需要fork工程，添加你的修改，然后发送pull请求即可！
在开始之前请阅读我们的代码样式指导文档（style-guide-2.0.md）。
在发送pull请求前请确保通过功能测试和单元测试；关于如何运行测试等更多信息，请继续阅读本文！

Make sure you read and follow the setup instructions in the README first.
首先，你必须阅读README文件且跟着设置走。

### Setting up Appium from Source
### 开工

An Appium setup involves the Appium server, which sends messages back and forth
between your test code and devices/emulators, and a test script, written in
whatever language binding exists that is compatible with Appium. Run an
instance of an Appium server, and then run your test.


The quick way to get started:
快速开始：

```center
git clone https://github.com/appium/appium.git
cd appium
npm install
gulp transpile # requires gulp, see below
npm install -g authorize-ios # for ios only
authorize-ios                # for ios only
node .
```
```center
git clone https://github.com/appium/appium.git
cd appium
npm install
gulp transpile # 需要gulp，往下看
npm install -g authorize-ios # 仅iOS
authorize-ios                # 仅iOS
node .
```

### Hacking on Appium
### 捣鼓Appium

Make sure you have `ant`, `maven`, `adb` installed and added to system `PATH`, also you
would need the android-16 sdk (for Selendroid) and android-19 sdk installed.
From your local repo's command prompt, install the following packages using the
following commands (if you didn't install `node` using Homebrew, you might have
to run `npm` with sudo privileges):
确保已安装ant、maven、adb且已添加到PATH环境变量，还需要安装android-16的sdk（Selendroid需要使用）和android-19的sdk。在Appium本地仓库打开命令行，使用以下命令安装以下包（如果你没有使用Homebrew安装过node，可能需要使用sudo运行npm）：

```center
npm install -g mocha
npm install -g gulp
npm install -g gulp-cli
npm install -g appium-doctor && appium-doctor --dev
npm install
gulp transpile
```

The first two commands install test and build tools (`sudo` may not be
necessary if you installed node.js via Homebrew). The third command verifies
that all of the dependencies are set up correctly (since dependencies for
building Appium are different from those for simply running Appium) and fourth
command installs all app dependencies and builds supporting binaries and test
apps. The final command transpiles all the code so that `node` can run it.

When pulling new code from GitHub, if there are changes to `package.json` it
is necessary to remove the old dependencies and re-run `npm install`:

```center
rm -rf node_modules
npm install
gulp transpile
```

At this point, you will be able to start the Appium server:

```center
node .
```

See [the server documentation](/docs/en/writing-running-appium/server-args.md)
for a full list of arguments.

#### Hacking with Appium for iOS

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1. Manually modify the element following `<allow-root>` under `<key>system.privilege.taskport</key>`
   in your `/etc/authorization` file to `<true/>`.

2. Run the following command which automatically modifies your
   `/etc/authorization` file for you:

    ```center
    npm install -g authorize-ios
    sudo authorize-ios
	```

At this point, run:

```center
rm -rf node-modules
npm install
gulp transpile
```

Now your Appium instance is ready to go. Run `node .` to kick up the Appium server.

#### Hacking with Appium for Android

Set up Appium by running:

```center
rm -rf node-modules
npm install
gulp transpile
```

Make sure you have one and only one Android emulator or device running, e.g.,
by running this command in another process (assuming the `emulator` command is
on your path):

```center
emulator -avd <MyAvdName>
```

Now you are ready to run the Appium server via `node .`.

#### Making sure you're up to date

Since Appium uses dev versions of some packages, it often becomes necessary to
install new `npm` packages or update various things. Running `npm install` will
update everything necessary. You will also need to do this when Appium bumps
its version up. Prior to running `npm install` it is recommended to remove
all the old dependencies in the `node_modules` directory:

```center
rm -rf node-modules
npm install
gulp transpile
```

### Running Tests

First, check out our documentation on [running tests in
general](/docs/en/writing-running-appium/running-tests.md) Make sure your
system is set up properly for the platforms you desire to test on.

Once your system is set up and your code is up to date, you can run unit tests
with:

```center
gulp once
```

You can run functional tests for all supported platforms (after ensuring that
Appium is running in another window with `node .`) with:

```center
gulp e2e-test
```

Before committing code, please run `gulp once` to execute some basic tests and
check your changes against code quality standards.
