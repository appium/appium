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

To get around this, Appium can be configured to use a particular Chromedriver version,
either at install time, by either passing the `--chromedriver_version` config
property (e.g., `npm install appium --chromedriver_version="2.16"`) or specifying
the version in the `CHROMEDRIVER_VERSION` environment variable (i.e., `CHROMEDRIVER_VERSION=2.20 npm install appium`;
this can also be set to `LATEST` to get the most recent version),
or at runtime, by specifying the `--chromedriver-executable` server flag, along
with the full path to the Chromedriver executable which was manually downloaded
(e.g., `appium --chromedriver-executable /path/to/my/chromedriver`).

The following is a list of Chromedriver versions and their corresponding minimum
Chrome version that is automatable:

| Version | Minimum Chrome Version | Link to Chromedriver                                                      |
|=========|========================|===========================================================================|
| 2.29    | 57.0.2987.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.29/) |
| 2.28    | 55.0.2883.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.28/) |
| 2.27    | 54.0.2840.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.27/) |
| 2.26    | 53.0.2785.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.26/) |
| 2.25    | 53.0.2785.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.25/) |
| 2.24    | 52.0.2743.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.24/) |
| 2.23    | 51.0.2704.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.23/) |
| 2.22    | 49.0.2623.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.22/) |
| 2.21    | 46.0.2490.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.21/) |
| 2.20    | 43.0.2357.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.20/) |
| 2.19    | 43.0.2357.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.19/) |
| 2.18    | 43.0.2357.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.18/) |
| 2.17    | 42.0.2311.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.17/) |
| 2.16    | 42.0.2311.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.16/) |
| 2.15    | 40.0.2214.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.15/) |
| 2.14    | 39.0.2171.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.14/) |
| 2.13    | 38.0.2125.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.13/) |
| 2.12    | 36.0.1985.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.12/) |
| 2.11    | 36.0.1985.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.11/) |
| 2.10    | 33.0.1751.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.10/) |
| 2.9     | 31.0.1650.59           | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.9/)  |
| 2.8     | 30.0.1573.2            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.8/)  |
| 2.7     | 30.0.1573.2            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.7/)  |
| 2.6     |                        | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.6/)  |
| 2.5     |                        | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.5/)  |
| 2.4     | 29.0.1545.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.4/)  |
| 2.3     | 28.0.1500.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.3/)  |
| 2.2     | 27.0.1453.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.2/)  |
| 2.1     | 27.0.1453.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.1/)  |
| 2.0     | 27.0.1453.0            | [link](https://chromedriver.storage.googleapis.com/index.html?path=2.0/)  |

The complete list of available Chromedriver releases is [here](https://chromedriver.storage.googleapis.com/index.html). To find
the minimum supported version for any particular version, get the [Chromium](https://www.chromium.org/Home)
[source code](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md),
check out the release commit, and check the variable `kMinimumSupportedChromeVersion`
in the file `src/chrome/test/chromedriver/chrome/version.cc`.

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
