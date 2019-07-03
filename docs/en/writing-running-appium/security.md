# Security

The Appium team makes every effort to ensure the security of the Appium server. This is especially important when Appium is run in a multitenant environment, or when multiple users are running sessions on the same Appium server. In general, if you're running your own Appium server locally, and not sharing it with anyone else, and don't expose Appium's port to the wider internet, you should have nothing to worry about, and can safely enable all Appium's features.

But because many Appium users might not be able to guarantee such a safe environment, the Appium team puts many features behind a security protection mechanism which forces system admins (the people that are in charge of starting the Appium server) to opt-in to these features explicitly.

For security reasons, Appium client sessions can _not_ request feature enablement via capabilities. This is the responsibility of the one who launches the Appium server.

## Security Server Args

The [server args](/docs/en/writing-running-appium/server-args.md) doc outlines three relevant arguments which may be passed to Appium when starting it from the command line:

* `--relaxed-security`: Setting this flag turns on _all_ insecure features (unless blocked by `--deny-insecure`; see below)
* `--allow-insecure`: Setting this flag to a comma-separated list of feature names or a path to a file containing a feature list (each name on a separate line) will allow _only_ the features listed. For example, `--allow-insecure=adb_shell` will cause _only_ the ADB shell execution feature to be enabled. This is true _unless_ `--relaxed-security` is also used, in which case all features will still be enabled. It makes no sense to combine this flag with `--relaxed-security`.
* `--deny-insecure`: This flag can likewise be set to a comma-separated list of feature names, or a path to a feature file. Any features listed here will be _disabled_, regardless of whether `--relaxed-security` is set and regardless of whether the names are also listed with `--allow-insecure`.

## Insecure Features

Each Appium driver is responsible for its own security, and can create its own feature names. These are the features and names we know about for the officially-supported Appium drivers.

|Feature Name|Description|AutomationName|
|------------|-----------|-------|
|`get_server_logs`|Allows retrieving of Appium server logs via the Webdriver log interface|IOS, XCUITest, Android, UiAutomator2, Espresso|
|`adb_shell`|Allows execution of arbitrary shell commands via ADB, using the `mobile: shell` command|Android, UiAutomator2, Espresso|
|`shutdown_other_sims`|Allow any session to use a capability to shutdown any running simulators on the host|XCUITest|
|`perf_record`|Allow recording the system performance and other metrics of the simulator|XCUITest|
|`chromedriver_autodownload`|Allow to downalod ChromeDriver automatically if Appium does not have proper the version |Android, UiAutomator2, Espresso|

## For Driver Developers

2 methods exist on objects of classes which extend `BaseDriver`, which make the life of the driver developer easier when checking availability of insecure features:

* `this.isFeatureEnabled(name)`: returns true or false depending on whether the server security flags combine to allow the feature in question.
* `this.ensureFeatureEnabled(name)`: throws an error with the feature name and a link to this doc if the feature in question is not allowed.
