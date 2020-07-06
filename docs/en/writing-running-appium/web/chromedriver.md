## Chromedriver

Appium supports automating Android web pages (in Chrome and the built-in Browser) and
hybrid apps that are Chrome-backed, by managing a [Chromedriver](https://sites.google.com/a/chromium.org/chromedriver/)
instance and proxying commands to it when necessary. It comes bundled with the
[latest version of Chromedriver](https://chromedriver.storage.googleapis.com/LATEST_RELEASE), installed through the
npm package [appium-chromedriver](https://www.npmjs.com/package/appium-chromedriver)
(Github: [appium-chromedriver](https://github.com/appium/appium-chromedriver)).

With each update to Chromedriver there is an increase in the minimum
supported version of Chrome, such that older devices are often unable to be automated
with the bundled version. In the Appium server logs there will be an error like:
```
An unknown server-side error occurred while processing the command.
Original error: unknown error: Chrome version must be >= 55.0.2883.0
```

To get around this it is necessary to provide Appium with a proper Chromedriver binary,
that [matches](https://raw.githubusercontent.com/appium/appium-chromedriver/master/config/mapping.json)
to the Chrome engine version running on the device under test.
Read the `Chromedriver/Chrome compatibility` topic below to know more about finding a matching Chromedriver executable.

There are several ways to provide a customized Chromedriver to Appium:

#### When installing the server

Provide `--chromedriver_version` command line containing the actual version number
```
npm install appium --chromedriver_version="2.16"
```
Or specify the version in the `CHROMEDRIVER_VERSION` environment variable,
e.g,
```
CHROMEDRIVER_VERSION=2.20 npm install appium
```
This can also be set to `LATEST` to get the most recent version.

#### When starting the server

Chromedriver version can be specified at runtime, by specifying the
`--chromedriver-executable` server flag, along with the full path to the
Chromedriver executable which was manually downloaded and put to the server file system, e.g.,
```
appium --chromedriver-executable /path/to/my/chromedriver
```

#### When starting a session (manual discovery)

Chromedriver version can be specified in session capabilities, by providing the
`chromedriverExecutable` cap, containing the full path to a matching
Chromedriver executable which must be manually downloaded and put to the server file system.
See http://appium.io/docs/en/writing-running-appium/caps/ for more details

#### When starting a session (automated discovery)

Appium could also try to detect the version of the target Chrome engine automatically and
download matching chromedriver for it automatically if it does not exist on the local file system.
Read the `Automatic discovery of compatible Chromedriver` topic below for more details.


### Chromedriver/Chrome compatibility

The list of Chromedriver versions and their matching minimum
Chrome versions could be found at https://raw.githubusercontent.com/appium/appium-chromedriver/master/config/mapping.json

Since version *2.46* Google has changed the rules for Chromedriver versioning, so now the major Chromedriver version corresponds to the major web view/browser version, that it can automate. Follow the [Version Selection](https://chromedriver.chromium.org/downloads/version-selection) document in order to manually find the Chromedriver, that supports your current browser/web view if its major version is equal or above *73*.

To find the minimum supported browsers for older Chromedriver versions (below *73*), get the [Chromium](https://www.chromium.org/Home)
[source code](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md), check out the release commit, and check the variable `kMinimumSupportedChromeVersion`
in the file `src/chrome/test/chromedriver/chrome/version.cc`. (To find the
release commits, you can use `git log --pretty=format:'%h | %s%d' | grep -i "Release Chromedriver version"`.)

The complete list of available Chromedriver releases and release notes is [here](https://chromedriver.storage.googleapis.com/index.html).


### Automatic discovery of compatible Chromedriver

Beginning with Appium 1.8.0, Appium is able to pick the correct Chromedriver for the
version of Chrome under test. While Appium only comes bundled with the Chromedriver
most recently released at the time of the Appium version's release, more Chromedriver
versions can be downloaded and either placed inside the Appium installation (_not
  recommended_ since upgrading Appium will remove them) or in a custom location,
which can be indicated to Appium with the `chromedriverExecutableDir` desired
capability. This capability is the absolute path to the directory in which you have
placed one or more Chromedriver executables.

As well, since new versions of Chromedriver may be available that were not when
an Appium version was released, a custom mapping of Chromedrivers to the minimum
Chrome version they support can be given to Appium through the `chromedriverChromeMappingFile`
desired capability. This should be the absolute path to a file with the mapping
in it. The contents of the file need to be parsable as a JSON object, like:
```JSON
{
  "2.42": "63.0.3239",
  "2.41": "62.0.3202"
}
```

Since Appium 1.15.0 there is a possibility to automatically download the necessary chromedriver(s) into `chromedriverExecutableDir` from the official Google storage. The script will automatically search for the newest chromedriver version that supports the given browser/web view, download it (the hash sum is verified as well for the downloaded archive) and add to the `chromedriverChromeMappingFile` mapping. Everything, which is needed to be done from your side is to execute the server with `chromedriver_autodownload` feature enabled (like `appium --allow-insecure chromedriver_autodownload`).
You can also check the [Security](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/security.md) document for more details on how to control potentially insecure server features.


### Troubleshooting network issues

When Appium is installed it needs to download Chromedriver, so there is the possibility
that there could be network problems that make the install fail.

By default Chromedriver is retrieved from `https://chromedriver.storage.googleapis.com/`.
To use a mirror of the ChromeDriver binaries use npm config property `chromedriver_cdnurl`.

```bash
npm install appium-chromedriver --chromedriver_cdnurl=http://npm.taobao.org/mirrors/chromedriver
```

Or add the property into your [`.npmrc`](https://docs.npmjs.com/files/npmrc) file.

```bash
chromedriver_cdnurl=http://npm.taobao.org/mirrors/chromedriver
```

Another option is to use PATH variable `CHROMEDRIVER_CDNURL`.

```bash
CHROMEDRIVER_CDNURL=http://npm.taobao.org/mirrors/chromedriver npm install appium-chromedriver
```

It may also be necessary to adjust network proxy and firewall settings to allow
the download to occur.


### W3C support

Chromedriver didn't follow the W3C standard until version 75. If you encounter proxy command error like [this issue](https://github.com/appium/python-client/issues/234), please update your Chromedriver version.
Old Android devices can't use newer chrome drivers. You can avoid the error if you run tests with the Mobile JSON Wire Protocol.
Since major version *75* W3C mode is the default one for Chromedriver, although it could be still switched to JSONWP one depending on the passed session capabilities.
You can read the history of W3C support in Chromedriver from [downloads](https://sites.google.com/a/chromium.org/chromedriver/downloads).
