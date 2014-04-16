Automating mobile web apps
======================

If you're interested in automating your web app in Mobile Safari on iOS or
Chrome on Android, Appium can help you. Basically, you write a normal WebDriver
test, and use Appium as the Selenium server with a special set of desired
capabilities.

### Mobile Safari on Simulator

First of all, make sure developer mode is turned on in your Safari
preferences so that the remote debugger port is open.

If you are using the simulator or a real device, you MUST run Safari before
attempting to use Appium.

Then, use desired capabilities like these to run your test in mobile Safari:

```js
{
  app: 'safari'
  , device: 'iPhone Simulator'
  , version: '6.1'
}
```

### Mobile Safari on a Real iOS Device

To be able to run your tests against mobile Safari we use the [SafariLauncher
 App](https://github.com/snevesbarros/SafariLauncher) to launch Safari. Once
 Safari has been launched the Remote Debugger automatically connects using
 the [ios-webkit-webkit-proxy](https://github.com/google/ios-webkit-debug-proxy).

<b>NOTE:</b> There is currently [a bug](https://github.com/google/ios-webkit-debug-proxy/issues/38)
in the ios-webkit-debug-proxy. You have to trust the machine before you can run the ios-webkit-debug-proxy
against your iOS device.

#### Setup

Before you can run your tests against Safari on a real device you will need to:
* Have the <b>ios-webkit-debug-proxy</b> installed and running (see the [hybrid docs](hybrid)  for instructions)
* Turn on <b>web inspector</b> on iOS device (<b>settings > safari >
advanced</b>, only for iOS 6.0 and up)
* Create a <b>provisioning profile</b> that can be used to deploy the SafariLauncherApp.

To create a profile for the launcher go into the <b>Apple Developers Member Center</b> and:
  * <b>Step 1:</b> Create a <b>new App Id</b> and select the WildCard App ID option and set it to "*"
  * <b>Step 2:</b> Create a <b>new Development Profile</b> and for App Id select the one created in step 1.
  * <b>Step 3:</b> Select your <b>certificate(s) and device(s)</b> and click next.
  * <b>Step 4:</b> Set the profile name and <b>generate the profile</b>.
  * <b>Step 5:</b> Download the profile and open it with a text editor.
  * <b>Step 6:</b> Search for the <b>UUID</b> and the string for it is your <b>identity code</b>.

Now that you have a profile open a terminal and run the following commands:

```bash
$ git clone https://github.com/appium/appium.git
$ cd appium

# Option 1: You dont define any parameters and it will set the code signing identity to 'iPhone Developer'
$ ./reset.sh --ios --real-safari

# Option 2: You define the code signing identity and allow xcode to select the profile identity code (if it can).
$ ./reset.sh --ios --real-safari --code-sign '<code signing idendity>'

# Option 3: You define both the code signing identity and profile identity code.
$ ./reset.sh --ios --real-safari --code-sign '<code signing idendity>' --profile '<retrieved profile identity code>'

# Once successfully configured and with the safari launcher built, start the server as per usual
$ node /lib/server/main.js -U <UDID>
```

#### Running your test

To configure you test to run against safari simpley set the <b>"app"</b> to be <b>"safari"</b>.

##### Java Example

```java
//setup the web driver and launch the webview app.
DesiredCapabilities desiredCapabilities = new DesiredCapabilities();
desiredCapabilities.setCapability("app", "safari");
URL url = new URL("http://127.0.0.1:4723/wd/hub");
RemoteWebDriver remoteWebDriver = new RemoteWebDriver(url, desiredCapabilities);

// Navigate to the page and interact with the elements on the guinea-pig page using id.
remoteWebDriver.get("http://saucelabs.com/test/guinea-pig");
WebElement div = remoteWebDriver.findElement(By.id("i_am_an_id"));
Assert.assertEquals("I am a div", div.getText()); //check the text retrieved matches expected value
remoteWebDriver.findElement(By.id("comments")).sendKeys("My comment"); //populate the comments field by id.

//close the app.
remoteWebDriver.quit();
```

### Mobile Chrome on Emulator or Real Device

Pre-requisites:

*  Make sure Chrome (an app with the package `com.android.chrome`) is installed on your device or emulator. Getting Chrome for the x86 version of the emulator is not currently possible without building Chromium, so you may want to run an ARM emulator and then copy a Chrome APK from a real device to get Chrome on an emulator.
*  If downloaded from [NPM](https://www.npmjs.org/package/appium), or running from the [.app](https://github.com/appium/appium-dot-app), nothing needs to be done. If running from source, the `reset` script will download ChromeDriver and put it in `build`. A particular version can be specified by passing the `--chromedriver-version` option (e.g., `./reset.sh --android --chromedriver-version 2.8`), otherwise the most recent one will be retrieved.

Then, use desired capabilities like these to run your test in Chrome:

```js
{
  app: 'chrome'
  , device: 'Android'
};
```