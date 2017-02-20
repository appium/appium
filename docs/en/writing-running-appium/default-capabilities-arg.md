## The --default-capabilities flag

Appium 1.5 does away with most CLI flags that existed previously; the remainder can be converted into JSON and made part of the `--default-capabilities` flag. For example:

```
# raw JSON as an argument
--default-capabilities '{"app": "myapp.app", "deviceName": "iPhone Simulator"}'
# or the name of a JSON file
--default-capabilities /path/to/file.json
```

**Windows users** will need to escape the quotes in JSON passed on the command line: `--default-capabilities "{\"app\": \"myapp.app\"}"`



| Flag                      | JSON key                |
|---------------------------|-------------------------|
| --keep-artifacts          | keepArtifacts           |
| --platform-name           | platformName            |
| --platform-version        | platformVersion         |
| --automation-name         | automationName          |
| --device-name             | deviceName              |
| --browser-name            | browserName             |
| --app                     | app                     |
| --launch-timeout          | launchTimeout           |
| --language                | language                |
| --locale                  | locale                  |
| --udid                    | udid                    |
| --orientation             | orientation             |
| --no-reset                | noReset                 |
| --full-reset              | fullReset               |
| --app-pkg                 | appPackage              |
| --app-activity            | appActivity             |
| --app-wait-package        | appWaitPackage          |
| --app-wait-activity       | appWaitActivity         |
| --device-ready-timeout    | deviceReadyTimeout      |
| --android-coverage        | androidCoverage         |
| --avd                     | avd                     |
| --avd-args                | avdArgs                 |
| --use-keystore            | useKeystore             |
| --keystore-path           | keystorePath            |
| --keystore-password       | keystorePassword        |
| --key-alias               | keyAlias                |
| --key-password            | keyPassword             |
| --intent-action           | intentAction            |
| --intent-category         | intentCategory          |
| --intent-flags            | intentFlags             |
| --intent-args             | optionalIntentArguments |
| --dont-stop-app-on-reset  | dontStopAppOnReset      |
| --calendar-format         | calendarFormat          |
| --native-instruments-lib  | nativeInstrumentsLib    |
| --keep-keychains          | keepKeyChains           |
| --localizable-strings-dir | localizableStringsDir   |
| --show-ios-log            | showIOSLog              |
| --reboot                  | reboot                  |
