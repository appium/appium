## Chromedriver

Appium 支持对基于 Chrome 内核的 H5 应用（混合应用）或者网页（Chrome 中的网页或者内建的浏览器中的网页）进行自动化。Appium 管理维护着一个 [Chromedriver](https://sites.google.com/a/chromium.org/chromedriver/) 实例，当需要的时候，使用代理模式，将命令传递给这个实例。这和[最新版本的 Chromedriver](https://chromedriver.storage.googleapis.com/LATEST_RELEASE)是绑定的。我们可以通过 npm 包来安装[appium-chromedriver](https://www.npmjs.com/package/appium-chromedriver)。(Github: [appium-chromedriver](https://github.com/appium/appium-chromedriver))

不幸的是，每次 Chromedriver 升级，支持的 Chrome 的最小版本都会升级，这就导致了老设备上经常无法在绑定的版本上自动化。在 Appium 的服务端就会有这样的错误日志：
```
An unknown server-side error occurred while processing the command.
Original error: unknown error: Chrome version must be >= 55.0.2883.0
```

为了解决这个问题，Appium 可以指定特定的 Chromedriver 版本。或者在安装的时候指定版本，比如 `npm install appium --chromedriver_version="2.16"` 
或者 `CHROMEDRIVER_VERSION=2.20 npm install appium`，也可以使用 `LATEST` 作为 `CHROMEDRIVER_VERSION` 的版本号，表示使用最新的 Chromedriver。或者可以在 Appium 运行的时候指定 `--chromedriver-executable` 为你自己下载的版本的路径，比如 `appium --chromedriver-executable /path/to/my/chromedriver`。

以下就是 Chromedriver 版本和支持的 Chrome 的最小版本的信息：


| Version | Minimum Chrome Version | Link to Chromedriver                                                      |
|---------|------------------------|---------------------------------------------------------------------------|
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


我们可以在[这里](https://chromedriver.storage.googleapis.com/index.html) 可以找到完整的 Chromedriver release 列表。任何一个 Chromedriver 支持的 Chrome 最小版本都可以在  [Chromium](https://www.chromium.org/Home) 项目的[源码](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md)中找到。把发布那个提交给拉出来，然后在 `src/chrome/test/chromedriver/chrome/version.cc` 里找到 `kMinimumSupportedChromeVersion` 这个变量。

### 安装遇到的网络问题

Appium 安装的时候需要下载 Chromedriver，所以经常会遇到网络问题，尤其在有长城防火墙的中国。

Chromedriver 默认是从 `https://chromedriver.storage.googleapis.com/` 下载。如果要使用镜像的话，需要配置npm的参数 `chromedriver_cdnurl`

```bash
npm install appium-chromedriver --chromedriver_cdnurl=http://npm.taobao.org/mirrors/chromedriver
```

或者把这个参数加到你的 [`.npmrc`](https://docs.npmjs.com/files/npmrc) 文件中去.

```bash
chromedriver_cdnurl=http://npm.taobao.org/mirrors/chromedriver
```

也可以使用环境变量 `CHROMEDRIVER_CDNURL`.

```bash
CHROMEDRIVER_CDNURL=http://npm.taobao.org/mirrors/chromedriver npm install appium-chromedriver
```

当然最好开着代理或者vpn来下载更好。

本文由 [lihuazhang](https://github.com/lihuazhang) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
