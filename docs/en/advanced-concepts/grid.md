## Selenium Grid

You are able to register your appium server with a local [Selenium grid](https://code.google.com/p/selenium/wiki/Grid2) ([setup docs](http://docs.seleniumhq.org/docs/07_selenium_grid.jsp)) by using the
`--nodeconfig` server parameter.

```center
> appium --nodeconfig /path/to/nodeconfig.json
# or, if running from source:
> node . --nodeconfig /path/to/nodeconfig.json
```

In the node config file you have to define the `browserName`,
`version` and `platform` and based on these parameters the grid
will re-direct your test to the right device. You will also need to
configure your **host** details and the **selenium grid** details. For
a full list of all parameters and descriptions look
[here](http://code.google.com/p/selenium/source/browse/java/server/src/org/openqa/grid/common/defaults/GridParameters.properties)

Once you start the appium server and it registers with the grid,
you will see your device on the grid console page:

"http://**\<grid-ip-adress\>**:**\<grid-port\>**/grid/console"

### Grid Node Configuration Example json file

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

Valid platforms are listed [here](http://selenium.googlecode.com/git/docs/api/java/org/openqa/selenium/Platform.html)

If `url`, `host`, and `port` are not given, the config will be auto updated
to point to localhost:whatever-port-Appium-started-on.

If your Appium server is running on a different machine to your Selenium Grid server, make sure you use an external name/IP address in your `host` & `url` docs; `localhost` and `127.0.0.1` will prevent Selenium Grid from connecting correctly.
