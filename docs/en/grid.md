---
title: Selenium Grid
layout: default
---

Selenium Grid
======================

You are able to register your appium server with a local grid by using the
<b>"--nodeconfig"</b> server parameter.

```bash
> node . -V --nodeconfig /path/to/nodeconfig.json
```

In the node config file you have to define the <b>"browserName"</b>,
<b>"version"</b> and <b>"platform"</b> and based on these parameters the grid
 will re-direct your test to the right device. You will also need to
 configure you <b>host</b> details and the <b>selenium grid</b> details. For
 a full list of all parameters and descriptions look
 [here](http://code.google.com/p/selenium/source/browse/java/server/src/org/openqa/grid/common/defaults/GridParameters.properties)

Once you start the appium server and it registers with the grid,
you will see your device on the grid console page:

"http://<b>\<grid-ip-adress\></b>:<b>\<grid-port\></b>/grid/console"

## Grid Node Configuration Example json file

```xml
{
  "capabilities":
      [
        {
          "browserName": "<e.g._iPhone5_or_iPad4>",
          "version":"<version_of_iOS_e.g._6.1>",
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

If `url`, `host`, and `port` are not given, the config will be auto updated to point to localhost:whatever-port-Appium-started-on.