Selenium Grid
======================

You are able to register you appium server with a local grid by using the "--nodeconfig" server parameter.

```bash
> node server.js -V --nodeconfig /path/to/nodeconfig.json

```

In the json node config file you have to define the "browserName", "version" and "platform" and based on these parameters the grid will re-direct your test to the right device.

## Grid Node Configuration Example json file

```xml
{
  "capabilities":
      [
        {
          "browserName": "<e.g. iPhone5, iPad4>",
          "version":"<version of iOS e.g. 6.1>",
          "maxInstances": 1,
          "platform":"MAC"

        }

      ],
  "configuration":
  {
  	"cleanUpCycle":2000,
  	 "timeout":30000,
    "proxy": "org.openqa.grid.selenium.proxy.DefaultRemoteProxy",
     "url":"http://<host name appium server/ip-address appium server>:<appium port>/wd/hub",
    "maxSession": 1,
    "port": <appium port>,
    "host": "<host name appium server/ip-address appium server>",
    "register": true,
    "registerCycle": 5000,
    "hubPort": <grid port >,
    "hubHost": "<Grid host name/grid ip-address>"
  }
}
```
