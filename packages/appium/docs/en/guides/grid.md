---
title: Appium and Selenium Grid
---

## Selenium Grid 4

The **relay** feature in Grid 4 allows you to proxy Appium requests to an Appium server instance.

Please check [Relaying commands to a service endpoint that supports WebDriver](https://www.selenium.dev/documentation/grid/configuration/toml_options/#relaying-commands-to-a-service-endpoint-that-supports-webdriver) and [Selenium Grid 4 and Appium together in harmony](https://www.youtube.com/watch?v=3_aP2rsqZD0) about the configuration and for more details.

## Selenium Grid 3

You are able to register your Appium server with a local [Selenium Grid 3](https://www.selenium.dev/documentation/legacy/selenium_3/grid_3/)
([setup docs](https://www.selenium.dev/documentation/legacy/grid_3/setting_up_your_own_grid/)) by using the
`--nodeconfig` server argument.

```bash
appium server --nodeconfig /path/to/nodeconfig.json --base-path=/wd/hub

In the node config file you have to define the `browserName`,
`version` and `platform` and based on these parameters the grid
will re-direct your test to the right device. You will also need to
configure your **host** details and the **Selenium Grid** details. For
a full list of all parameters and descriptions look
[here](https://www.selenium.dev/documentation/legacy/selenium_3/grid_setup/)

Once you start the appium server and it registers with the grid,
you will see your device on the grid console page:

`http://**\<grid-ip-adress\>**:**\<grid-port\>**/grid/console`


New session capabilities should use an `appium:` prefix for non-W3C-standard capabilities such as
`automationName`, since the grid appends the given capabilities in both `desiredCapabilities`
and `firstMatch` in `capabilities`.


### Example Grid Node Configuration JSON

```json
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
    "host": "<host_name_appium_server_or_ip-address_appium_server>",
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

If `url`, `host`, and `port` are not given, the config will be auto updated
to point to localhost:whatever-port-Appium-started-on.

If your Appium server is running on a different machine to your Selenium Grid server, make sure you use an external name/IP address in your `host` & `url` docs; `localhost` and `127.0.0.1` will prevent Selenium Grid from connecting correctly.