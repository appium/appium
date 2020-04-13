## Selenium Grid

通过服务器参数 `--nodeconfig`，可以将 appium 服务器注册到本地的 [Selenium grid](https://github.com/SeleniumHQ/selenium/wiki/Grid2)

```center
> appium --nodeconfig /path/to/nodeconfig.json
# 或者使用源文件执行
> node . --nodeconfig /path/to/nodeconfig.json
```

在 Selenium 节点（Node）的配置文件里，你需要定义 `browserName`、`version` 和 `platform`，然后 Grid 会通过这些参数将你的测试重定向到正确的设备上。你还需要配置 `host` 和 `selenium grid` 的详细信息。详细的参数列表和描述信息，请查看 [这里](http://code.google.com/p/selenium/source/browse/java/server/src/org/openqa/grid/common/defaults/GridParameters.properties) 。

一旦你启动了 appium 服务器并且在 grid 里注册了信息，就可以在 grid 控制台看到你的设备：

"http://**\<grid-ip-adress\>**:**\<grid-port\>**/grid/console"

### Grid 节点的示例 JSON 配置文件

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
    "hubProtocol": "<Protocol_of_Grid_defaults_to_http>"
  }
}
```

如果没有给出 `url`、`host` 和 `port`，配置会自动指向 `localhost:whatever-port-Appium-started-on`。

如果你的 Appium Server 和 Selenium Grid 没有运行在同一台机器上，为确保 Selenium Grid 连接正常，请在你的 `host` & `url` 上使用外部域名或 IP 地址，而不是 `localhost` 和 `127.0.0.1`。

---
EOF.

本文由 [tobecrazy](https://github.com/tobecrazy) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。

翻译：@[Pandorym](https://github.com/Pandorym)
Last english version: 048ca4be43d15e078f583ddb973e2dbe0212a988, Mar 29, 2018
