## Running Appium from Source

So you want to run Appium from source and help fix bugs and add features?
Great! Just fork the project, make a change, and send a pull request! Please
have a look at our [Style Guide](style-guide.md) before getting to work.
Please make sure the unit and functional tests pass before sending a pull
request; for more information on how to run tests, keep reading!

Make sure you read and follow the setup instructions in the README first.

### Setting up Appium from Source

An Appium setup involves the Appium server, which sends messages back and forth
between your test code and devices/emulators, and a test script, written in
whatever language binding exists that is compatible with Appium. Run an
instance of an Appium server, and then run your test.

The quick way to get started:

```center
$ git clone https://github.com/appium/appium.git
$ cd appium
$ ./reset.sh
$ sudo ./bin/authorize-ios.js # for ios only
$ node .
```

### Hacking on Appium

Make sure you have ant, maven, adb installed and added to system PATH, also you
would need the android-16 sdk (for Selendroid) and android-19 sdk installed.
From your local repo's command prompt, install the following packages using the
following commands (if you didn't install `node` using homebrew, you might have
to run npm with sudo privileges):

```center
npm install -g mocha
npm install -g grunt-cli
node bin/appium-doctor.js --dev
./reset.sh --dev
```

The first two commands install test and build tools (`sudo` may not be
necessary if you installed node.js via Homebrew). The third command verifies
that all of the dependencies are set up correctly (since dependencies for
building Appium are different from those for simply running Appium) and fourth
command installs all app dependencies and builds supporting binaries and test
apps. `reset.sh` is also the recommended command to run after pulling changes
from master. Running `reset.sh` with the `--dev` flag also installs git hooks
that make sure code quality is preserved before committing. At this point,
you're able to start the Appium server:

```center
node .
```

See [the server documentation](/docs/en/writing-running-appium/server-args.md)
for a full list of arguments.

Like the power of automating dev tasks? Check out the [Appium Grunt tasks](/docs/en/contributing-to-appium/grunt.md)
available to help with building apps, installing apps, generating docs, etc.

#### Hacking with Appium for iOS

To avoid a security dialog that may appear when launching your iOS apps you'll
have to modify your `/etc/authorization` file in one of two ways:

1. Manually modify the element following `<allow-root>` under `<key>system.privilege.taskport</key>`
   in your `/etc/authorization` file to `<true/>`.

2. Run the following grunt command which automatically modifies your
   `/etc/authorization` file for you:

    ```center
    sudo ./bin/authorize-ios.js
    ```

At this point, run:

```center
./reset.sh --ios --dev
```

Now your Appium instance is ready to go. Run `node .` to kick up the Appium server.

#### Hacking with Appium for Android

Bootstrap running for Android by running:

```center
./reset.sh --android --dev
```

If you want to use [Selendroid](http://github.com/DominikDary/selendroid) for
support on older Android platforms like 2.3, then run:

```center
./reset.sh --selendroid --dev
```

Make sure you have one and only one Android emulator or device running, e.g.
by running this command in another process (assuming the `emulator` command is
on your path):

```center
emulator -avd <MyAvdName>
```

Now you are ready to run the Appium server via `node .`.

#### Making sure you're up to date

Since Appium uses dev versions of some packages, it often becomes necessary to
install new `npm` packages or update various things. There's a handy shell script
to do all this for all platforms (the `--dev` flag gets dev npm dependencies
and test applications used in the Appium test suite). You will also need to do
this when Appium bumps its version up:

```center
./reset.sh --dev
```

Or you can run reset for individual platforms only:

```center
./reset.sh --ios --dev
./reset.sh --android --dev
./reset.sh --selendroid --dev
```

### 运行测试集
首先，签出我们的文档[一般运行测试情况下](/docs/en/writing-running-appium/running-tests.md) 
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

