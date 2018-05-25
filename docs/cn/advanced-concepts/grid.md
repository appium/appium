# Selenium Grid

通过 `--nodeconfig` 这个服务端参数，可以将 appium server 注册到本地的 [Selenium grid](https://code.google.com/p/selenium/wiki/Grid2) ([Grid 的配置文档](http://docs.seleniumhq.org/docs/07_selenium_grid.jsp))

```center
>  appium --nodeconfig /path/to/nodeconfig.json
# 或者使用源文件执行
> node . --nodeconfig /path/to/nodeconfig.json
```

在 node 的配置文件里，你需要定义 `browserName`，`version` 和 `platform`。
通过这些参数，selenium grid 会将你的测试定向到正确的设备上去。你还需要配置你的 `host` 详细信息和
`selenium grid` 的详细信息。你可以在 <a href="http://code.google.com/p/selenium/source/browse/java/server/src/org/openqa/grid/common/defaults/GridParameters.properties">这里</a> 找到详细的参数列表和描述信息。

一旦你启动了 appium 服务器并且在 grid 里注册了信息，就可以在 grid 控制台发现你的设备：

"http://**\<grid-ip-adress\>**:**\<grid-port\>**/grid/console"

### Grid node的配置文件例子

```xml
{
  "capabilities":
      [
        {
          "browserName": "<e.g._iPhone5_or_iPad4>",
          "version":"<version_of_iOS_e.g._7.1>",
          "maxInstances": 1,
          "platform":"<platform_e.g._MAC_or_ANDROID>"
        }
      ],
  "configuration":
  {
    "cleanUpCycle":2000,
    "timeout":30000,
    "proxy": "org.openqa.grid.selenium.proxy.DefaultRemoteProxy",
    "url":"http://<host_name_appium_server_or_ip-address_appium_server>:<appium_port>/wd/hub",
    "host": <host_name_appium_server_or_ip-address_appium_server>,
    "port": <appium_port>,
    "maxSession": 1,
    "register": true,
    "registerCycle": 5000,
    "hubPort": <grid_port>,
    "hubHost": "<Grid_host_name_or_grid_ip-address>"
  }
}
```

可以在 <a href="http://www.seleniumhq.org/about/platforms.jsp">这里</a>查看有效的 platform 参数。

如果没有给出 `url`、`host` 和 `port`，配置会自动指向 `localhost:whatever-port-Appium-started-on`。

如果你的 Appium Server 和 Selenium Grid 没有运行在同一台机器上，为确保 Selenium Grid 连接正常，请在你的 `host` & `url` 上使用外部域名或 IP 地址，而不是 localhost 和 127.0.0.1

本文由 [tobecrazy](https://github.com/tobecrazy) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。
