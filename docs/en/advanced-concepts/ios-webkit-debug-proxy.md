## iOS WebKit Debug Proxy

For accessing web views on real iOS device appium uses [ios_webkit_debug_proxy](https://github.com/google/ios-webkit-debug-proxy).

### Installation

#### Using Homebrew

To install the latest tagged version of the ios-webkit-debug-proxy using
Homebrew, run the following commands in the terminal:

 ``` center
 # The first command is only required if you don't have brew installed.
 > ruby -e "$(curl -fsSL https://raw.github.com/mxcl/homebrew/go/install)"
 > brew update
 > brew install ios-webkit-debug-proxy
 ```

**NOTE:** As of April 2, 2015, the primary ios-webkit-debug-proxy repository
has not been updated for some time. **We currently recommend using [James Chuong's
fork](https://github.com/jchuong/ios-webkit-debug-proxy)**. To do so, you'll need
to build from source. If you're unfamiliar with building with GMake, try following
the steps below.

#### Building ios-webkit-debug-proxy from source

Open the command terminal on your mac. You can find instructions on how to open the
terminal via your favorite search engine. Once that is open, verify you have
[Homebew](http://brew.sh/) installed:

```shell
$ brew -v
```

When you're certain you have Homebrew, do the following (the $ indicates the command
line prompt, do not enter it):

```shell
$ cd  ~
$ git clone https://github.com/jchuong/ios-webkit-debug-proxy.git
$ cd ios-webkit-debug-proxy
$ brew install autoconf automake libusb libplist usbmuxd
$ brew install --HEAD ideviceinstaller
$ ./autogen.sh
$ ./configure
$ make
$ sudo make install
```

#### Running ios-webkit-debug-proxy

Once installed you can start the proxy with the following command:

``` center
# Change the udid to be the udid of the attached device and make sure to set the port to 27753
# as that is the port the remote-debugger uses. You can learn how to retrieve the UDID from
# Apple's developer resources.
> ios_webkit_debug_proxy -c 0e4b2f612b65e98c1d07d22ee08678130d345429:27753 -d
```

You may also use the ios-webkit-debug-proxy-launcher to launch the
proxy. It monitors the proxy log for errors, and relaunch the proxy
where needed. This is also optional and may help with recent devices:

``` center
# change the udid
> ./bin/ios-webkit-debug-proxy-launcher.js -c 0e4b2f612b65e98c1d07d22ee08678130d345429:27753 -d
```

**NOTE:** the proxy requires the **"web inspector"** to be turned on to
allow a connection to be established. Turn it on by going to **settings >
safari > advanced**. Please be aware that the web inspector was **added as
part of iOS 6** and was not available previously.
