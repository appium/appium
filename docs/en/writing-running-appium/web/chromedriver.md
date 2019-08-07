## Chromedriver

Appium supports automating Android web pages (in Chrome and the built-in Browser) and
hybrid apps that are Chrome-backed, by managing a [Chromedriver](https://sites.google.com/a/chromium.org/chromedriver/)
instance and proxying commands to it when necessary. It comes bundled with the
[latest version of Chromedriver](https://chromedriver.storage.googleapis.com/LATEST_RELEASE), installed through the
npm package [appium-chromedriver](https://www.npmjs.com/package/appium-chromedriver)
(Github: [appium-chromedriver](https://github.com/appium/appium-chromedriver)).

Unfortunately, with each update to Chromedriver there is an increase in the minimum
supported version of Chrome, such that older devices are often unable to be automated
with the bundled version. In the Appium server logs there will be an error like:
```
An unknown server-side error occurred while processing the command.
Original error: unknown error: Chrome version must be >= 55.0.2883.0
```

To get around this, Appium can be configured to use a particular Chromedriver
version, either at install time, by either passing the `--chromedriver_version`
config property, e.g.,
```
npm install appium --chromedriver_version="2.16"
```
Or specifying the version in the `CHROMEDRIVER_VERSION` environment variable,
e.g,
```
CHROMEDRIVER_VERSION=2.20 npm install appium
```
This can also be set to `LATEST` to get the most recent version.

Finally, a version can be specified at runtime, by specifying the
`--chromedriver-executable` server flag, along with the full path to the
Chromedriver executable which was manually downloaded, e.g.,
```
appium --chromedriver-executable /path/to/my/chromedriver
```

### Chromedriver/Chrome compatibility

The following is a list of Chromedriver versions and their corresponding minimum
Chrome version that is automatable:

| Version | Minimum Chrome Version | Link to Chromedriver                                                              |
|---------|------------------------|-----------------------------------------------------------------------------------|
| 2.46    | 71                     | [v2.46 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.46/) |
| 2.45    | 70                     | [v2.45 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.45/) |
| 2.44    | 69.0.3497.0            | [v2.44 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.44/) |
| 2.43    | 69.0.3497.0            | [v2.43 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.43/) |
| 2.42    | 68.0.3440.0            | [v2.42 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.42/) |
| 2.41    | 67.0.3360.0            | [v2.41 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.41/) |
| 2.40    | 66.0.3359.0            | [v2.40 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.40/) |
| 2.39    | 66.0.3359.0            | [v2.39 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.39/) |
| 2.38    | 65.0.3325.0            | [v2.38 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.38/) |
| 2.37    | 64.0.3282.0            | [v2.37 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.37/) |
| 2.36    | 63.0.3239.0            | [v2.36 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.36/) |
| 2.35    | 62.0.3202.0            | [v2.35 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.35/) |
| 2.34    | 61.0.3163.0            | [v2.34 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.34/) |
| 2.33    | 60.0.3112.0            | [v2.33 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.33/) |
| 2.32    | 59.0.3071.0            | [v2.32 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.32/) |
| 2.31    | 58.0.3029.0            | [v2.31 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.31/) |
| 2.30    | 58.0.3029.0            | [v2.30 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.30/) |
| 2.29    | 57.0.2987.0            | [v2.29 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.29/) |
| 2.28    | 55.0.2883.0            | [v2.28 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.28/) |
| 2.27    | 54.0.2840.0            | [v2.27 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.27/) |
| 2.26    | 53.0.2785.0            | [v2.26 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.26/) |
| 2.25    | 53.0.2785.0            | [v2.25 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.25/) |
| 2.24    | 52.0.2743.0            | [v2.24 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.24/) |
| 2.23    | 51.0.2704.0            | [v2.23 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.23/) |
| 2.22    | 49.0.2623.0            | [v2.22 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.22/) |
| 2.21    | 46.0.2490.0            | [v2.21 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.21/) |
| 2.20    | 43.0.2357.0            | [v2.20 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.20/) |
| 2.19    | 43.0.2357.0            | [v2.19 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.19/) |
| 2.18    | 43.0.2357.0            | [v2.18 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.18/) |
| 2.17    | 42.0.2311.0            | [v2.17 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.17/) |
| 2.16    | 42.0.2311.0            | [v2.16 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.16/) |
| 2.15    | 40.0.2214.0            | [v2.15 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.15/) |
| 2.14    | 39.0.2171.0            | [v2.14 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.14/) |
| 2.13    | 38.0.2125.0            | [v2.13 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.13/) |
| 2.12    | 36.0.1985.0            | [v2.12 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.12/) |
| 2.11    | 36.0.1985.0            | [v2.11 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.11/) |
| 2.10    | 33.0.1751.0            | [v2.10 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.10/) |
| 2.9     | 31.0.1650.59           | [v2.9 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.9/)   |
| 2.8     | 30.0.1573.2            | [v2.8 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.8/)   |
| 2.7     | 30.0.1573.2            | [v2.7 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.7/)   |
| 2.6     | 29.0.1545.0            | [v2.6 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.6/)   |
| 2.5     | 29.0.1545.0            | [v2.5 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.5/)   |
| 2.4     | 29.0.1545.0            | [v2.4 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.4/)   |
| 2.3     | 28.0.1500.0            | [v2.3 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.3/)   |
| 2.2     | 27.0.1453.0            | [v2.2 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.2/)   |
| 2.1     | 27.0.1453.0            | [v2.1 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.1/)   |
| 2.0     | 27.0.1453.0            | [v2.0 (link)](https://chromedriver.storage.googleapis.com/index.html?path=2.0/)   |

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

### Installing an network issues

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
