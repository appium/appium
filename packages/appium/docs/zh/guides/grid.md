---
title: Appium and Selenium Grid
---

## Using Selenium Grid 4+

The
[relay](https://www.selenium.dev/documentation/grid/configuration/toml_options/#relaying-commands-to-a-service-endpoint-that-supports-webdriver)
feature in Grid 4 allows you to proxy Appium requests to an Appium server instance. Here is
an example walkthrough of how you would connect two different Appium instances to a Selenium Grid.

### Define the Appium configs

Each Appium instance should have a config file that can be easily updated. It should contain any
information which needs to be unique to that particular server (e.g., ports its drivers should use
that others should not). We are going to have 2 Appium servers, so we will need 2 config files:

```yaml
# appium1.yml
server:
  port: 4723
  use-drivers:
    - xcuitest
  default-capabilities:
    appium:wdaLocalPort: 8100
    appium:mjpegServerPort: 9100
    appium:mjpegScreenshotUrl: "http://localhost:9100"
    appium:platformVersion: "26.0"
    appium:deviceName: "iPhone 17"
```

In the above YAML config file, we specify the Appium server port, the driver used, and parameters
for the driver that will be sent in as default capabilities. Our goal is to ensure that any other
drivers running on this host will not compete with system ports or other resources. The second
config file could look like the following, where we simply adjust a few ports to prevent clashes:

```yaml
# appium2.yml
server:
  port: 4733
  use-drivers:
    - xcuitest
  default-capabilities:
    appium:wdaLocalPort: 8110
    appium:mjpegServerPort: 9110
    appium:mjpegScreenshotUrl: "http://localhost:9110"
    appium:platformVersion: "26.0"
    appium:deviceName: "iPhone 16"
```

### Define the Grid node configs

We will be launching one Grid "node" per Appium server, to manage relaying commands and determining
capacity and online status, etc... So we should have one config file per Grid node as well. Each
node config should include the address of the Appium server it will target, as well as a list of
capability "configs" it should accept to relay a session request to Appium. Here is what the config
could look like for the two nodes:

```toml
# node1.toml
[server]
port = 5555

[node]
detect-drivers = false

[events]
publish = "tcp://HUB_IP_ADDRESS:4442"
subscribe = "tcp://HUB_IP_ADDRESS:4443"

[relay]
url = "http://localhost:4723"
status-endpoint = "/status"
configs = [
    "1", "{\"platformName\": \"iOS\", \"appium:automationName\": \"XCUITest\"}"
]
```

```toml
# node2.toml
[server]
port = 5565

[node]
detect-drivers = false

[events]
publish = "tcp://HUB_IP_ADDRESS:4442"
subscribe = "tcp://HUB_IP_ADDRESS:4443"

[relay]
url = "http://localhost:4733"
status-endpoint = "/status"
configs = [
    "1", "{\"platformName\": \"iOS\", \"appium:automationName\": \"XCUITest\"}"
]
```

Note that each node config also specifies a different port itself for the node to run on.

### Putting it together

The Grid nodes aren't enough--you'll also want a Grid "hub" that acts as a load balancer and
manager for all the nodes. So in the end we'll have 5 processes running at once: 2 Appium servers,
2 Grid nodes, and 1 Grid hub. It's best to run each of these in a separate terminal window to avoid
confusion of logs. Here is how you'd start each process:

0. `appium --config appium1.yml`
1. `appium --config appium2.yml`
2. `java -jar /path/to/selenium.jar node --config node1.toml`
3. `java -jar /path/to/selenium.jar node --config node2.toml`
4. `java -jar /path/to/selenium.jar hub`

Once you wait a few moments for the nodes to detect their Appium servers, and to register with the
hub, you'll be able to send all your Appium traffic via the single hub endpoint (defaulting to
`http://localhost:4444`).

And of course, you're able to link up Appium servers and nodes running on different machines in
your network to form a larger grid.

## Using Selenium Grid 3

It is possible to register your Appium server with a local [Selenium Grid 3](https://www.selenium.dev/documentation/legacy/selenium_3/grid_3/)
([setup docs](https://www.selenium.dev/documentation/legacy/grid_3/setting_up_your_own_grid/)) instance by using the
`--nodeconfig` server argument.

```bash
appium server --nodeconfig /path/to/nodeconfig.json --base-path=/wd/hub
```

In the referenced config file you have to define the `browserName`, `version` and `platform`
capabilities and based on these parameters the grid will re-direct your test to the right device.
You will also need to configure your host details and the Selenium Grid details. For a full list of
all parameters and descriptions see
[here](https://www.selenium.dev/documentation/legacy/selenium_3/grid_setup/).

Once you start the Appium server it will register with the grid, and you will see your device on
the grid console page:

`http://**\<grid-ip-adress\>**:**\<grid-port\>**/grid/console`

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
    "hubHost": "<Grid_host_name_or_grid_ip-address>",
    "hubProtocol": "<Protocol_of_Grid_defaults_to_http>"
  }
}
```

If `url`, `host`, and `port` are not given, the config will be auto updated to point to
`localhost:<appium-port>`.

If your Appium server is running on a different machine to your Selenium Grid server, make sure you
use an external name/IP address in your `host` and `url` configuration; `localhost` and `127.0.0.1`
will prevent Selenium Grid from connecting correctly.
