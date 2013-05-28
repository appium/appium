Selenium Grid
======================

You are able to register you appium server with a local grid by using the <b>"--nodeconfig"</b> server parameter.

```bash
> node server.js -V --nodeconfig /path/to/nodeconfig.json
```

In the node config file you have to define the <b>"browserName"</b>, <b>"version"</b> and <b>"platform"</b> and based on these parameters the grid will re-direct your test to the right device. You will also need to configure you <b>host</b> details and the <b>selenium grid</b> details. For a full list of all parameters and descriptions look <a href="http://code.google.com/p/selenium/source/browse/java/server/src/org/openqa/grid/common/defaults/GridParameters.properties">here</a>.

Once you start the appium server and it registers with the grid, you will see your device on the grid console page:

<b>"http://grid-ip-adress:grid-port/grid/console"</b>

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
