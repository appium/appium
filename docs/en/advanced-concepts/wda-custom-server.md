## How To Set Up And Customize WebDriverAgent Server

Appium for iOS uses [Facebook's WebDriverAgent](https://github.com/facebook/WebDriverAgent)
as automation backend. This backend is based on Apple's XCTest framework and shares all the
known problem that are present in XCTest. For some of them we have workarounds, but there
are some, that are hardly possible to workaround. The approach described in this article
allows to make automated tests more stable and gives you more control over what is happening
under the hood.

Important points:
 * The steps below are not necessary if default Appium capabilites are used.
 The server will do everything for you, however you won't have so much control over WDA.
 * It is mandatory to have SSH/Terminal access to the machine where the device under test
 is connected.


### WDA Setup

WebDriverAgent source is automically downloaded with Appium. The usual folder location
in case Appium is installed via npm tool (`npm install -g appium`) is
/usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/WebDriverAgent
If this was a fresh install then it is also necessary to download third-party dependencies
(_carthage_ tool is mandatory for this purpose: `brew install carthage`):

```bash
cd /usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/WebDriverAgent
./Scripts/bootstrap.sh -d
```

No futher confuguration steps are needed if you're going to execute your automated tests on
iOS Simulator.

Real device, however, requires some more work to be done. Follow
[real device configuration documentation](https://github.com/appium/appium-xcuitest-driver/blob/master/docs/real-device-config.md)
to setup code signing. Also, you'll need to have iproxy tool installed:

```bash
npm install -g iproxy
```

In order to make sure that WDA source is configured properly:

* Open /usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/WebDriverAgent/WebDriverAgent.xcodeproj
in Xcode
* Select _WebDriverAgentRunner_ project
* Select your real phone/Simulator you'd like to run automated tests on as build target
* Select Product->Test from the main menu

Xcode should successfully build the project and install it on the real device/Simulator,
so you'll see the icon of WebDriverAgentRunner application on the springboard.


### WDA Startup

WebDriverAgent application acts as a REST server, which proxies external API requests to native XCTest calls
for your application under test. The server address will be _localhost_ if you run your tests on Simulator
or the actual phone IP address in case of real device. We use _iproxy_ to route network
requests to a real device from _localhost_ via USB, which means one can use this tool to unify
WDA network address for Simulator and for real device.

This helper class written in Java illustrates the main implementation details:

```java
public class WDAServer {
    private static final Logger log = ZLogger.getLog(WDAServer.class.getSimpleName());

    private static WDAServer instance = null;
    private final boolean isRealDevice;
    private final String deviceId;
    private final String platformVersion;

    private WDAServer() {
        try {
            this.isRealDevice = !getIsSimulatorFromConfig(getClass());
            String udid;
            if (isRealDevice) {
                udid = IOSRealDeviceHelpers.getUDID();
            } else {
                udid = IOSSimulatorHelpers.getId();
            }
            this.deviceId = udid;
            this.platformVersion = getPlatformVersionFromConfig(getClass());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        ensureToolsExistence();
        ensureParentDirExistence();
    }

    public synchronized static WDAServer getInstance() {
        if (instance == null) {
            instance = new WDAServer();
        }
        return instance;
    }

    private static final int PORT = 8100;
    private static final Timedelta RESTART_TIMEOUT = Timedelta.ofSeconds(90);
    public static final String SERVER_URL = String.format("http://127.0.0.1:%d", PORT);

    private boolean waitUntilIsRunning(Timedelta timeout) throws Exception {
        final URL status = new URL(SERVER_URL + "/status");
        try {
            new UrlChecker().waitUntilAvailable(timeout.asMillis(), TimeUnit.MILLISECONDS, status);
            return true;
        } catch (UrlChecker.TimeoutException e) {
            return false;
        }
    }

    // These settings are needed to properly sign WDA for real device tests
    // See https://github.com/appium/appium-xcuitest-driver for more details
    private static final File KEYCHAIN = new File(String.format("%s/%s",
            System.getProperty("user.home"), "/Library/Keychains/MyKeychain.keychain"));
    private static final String KEYCHAIN_PASSWORD = "******";

    private static final File IPROXY_EXECUTABLE = new File("/usr/local/bin/iproxy");
    private static final File XCODEBUILD_EXECUTABLE = new File("/usr/bin/xcodebuild");
    private static final File WDA_PROJECT =
            new File("/usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/" +
                    "WebDriverAgent/WebDriverAgent.xcodeproj");
    private static final String WDA_SCHEME = "WebDriverAgentRunner";
    private static final String CONFIGURATION = "Debug";
    public static final File XCODEBUILD_LOG = new File("/usr/local/var/log/appium/build.log");
    public static final File IPROXY_LOG = new File("/usr/local/var/log/appium/iproxy.log");

    private static final String[] IPROXY_CMDLINE = new String[]{
            IPROXY_EXECUTABLE.getAbsolutePath(),
            Integer.toString(PORT),
            Integer.toString(PORT),
            String.format("> %s 2>&1 &", IPROXY_LOG.getAbsolutePath())
    };

    private static void ensureParentDirExistence() {
        if (!XCODEBUILD_LOG.getParentFile().exists()) {
            if (!XCODEBUILD_LOG.getParentFile().mkdirs()) {
                throw new IllegalStateException(String.format(
                        "The script has failed to create '%s' folder for Appium logs. " +
                                "Please make sure your account has correct access permissions on the parent folder(s)",
                        XCODEBUILD_LOG.getParentFile().getAbsolutePath()));
            }
        }
    }

    private void ensureToolsExistence() {
        if (isRealDevice && !IPROXY_EXECUTABLE.exists()) {
            throw new IllegalStateException(String.format("%s tool is expected to be installed (`npm install -g iproxy`)",
                    IPROXY_EXECUTABLE.getAbsolutePath()));
        }
        if (!XCODEBUILD_EXECUTABLE.exists()) {
            throw new IllegalStateException(String.format("Xcode is not detected on the current system (%s)",
                    XCODEBUILD_EXECUTABLE.getAbsolutePath()));
        }
        if (!WDA_PROJECT.exists()) {
            throw new IllegalStateException(String.format("WDA project is expected to exist at %s",
                    WDA_PROJECT.getAbsolutePath()));
        }
    }

    private List<String> generateXcodebuildCmdline() {
        final List<String> result = new ArrayList<>();
        result.add(XCODEBUILD_EXECUTABLE.getAbsolutePath());
        result.add("clean build test");
        result.add(String.format("-project %s", WDA_PROJECT.getAbsolutePath()));
        result.add(String.format("-scheme %s", WDA_SCHEME));
        result.add(String.format("-destination id=%s", deviceId));
        result.add(String.format("-configuration %s", CONFIGURATION));
        result.add(String.format("IPHONEOS_DEPLOYMENT_TARGET=%s", platformVersion));
        result.add(String.format("> %s 2>&1 &", XCODEBUILD_LOG.getAbsolutePath()));
        return result;
    }

    private static List<String> generateKeychainUnlockCmdlines() throws Exception {
        final List<String> result = new ArrayList<>();
        result.add(String.format("/usr/bin/security -v list-keychains -s %s", KEYCHAIN.getAbsolutePath()));
        result.add(String.format("/usr/bin/security -v unlock-keychain -p %s %s",
                KEYCHAIN_PASSWORD, KEYCHAIN.getAbsolutePath()));
        result.add(String.format("/usr/bin/security set-keychain-settings -t 3600 %s", KEYCHAIN.getAbsolutePath()));
        return result;
    }

    public synchronized void restart() throws Exception {
        final String hostname = InetAddress.getLocalHost().getHostName();
        log.info(String.format("Trying to (re)start WDA server on %s:%s...", hostname, PORT));
        UnixProcessHelpers.killProcessesGracefully(IPROXY_EXECUTABLE.getName(),
                XCODEBUILD_EXECUTABLE.getName());

        final File scriptFile = File.createTempFile("script", ".sh");
        try {
            final List<String> scriptContent = new ArrayList<>();
            scriptContent.add("#!/bin/bash");
            if (isRealDevice && isRunningInJenkinsNetwork()) {
                scriptContent.add(String.join("\n", generateKeychainUnlockCmdlines()));
            }
            if (isRealDevice) {
                scriptContent.add(String.join(" ", IPROXY_CMDLINE));
            }
            final String wdaBuildCmdline = String.join(" ", generateXcodebuildCmdline());
            log.debug(String.format("Building WDA with command line:\n%s\n", wdaBuildCmdline));
            scriptContent.add(wdaBuildCmdline);
            try (Writer output = new BufferedWriter(new FileWriter(scriptFile))) {
                output.write(String.join("\n", scriptContent));
            }
            log.info(String.format("Waiting for WDA to be (re)started on %s:%s...", hostname, PORT));
            final Timedelta started = Timedelta.now();
            new ProcessBuilder("/bin/chmod", "u+x", scriptFile.getCanonicalPath())
                    .redirectErrorStream(true).start().waitFor(5, TimeUnit.SECONDS);
            final ProcessBuilder pb = new ProcessBuilder("/bin/bash", scriptFile.getCanonicalPath());
            final Map<String, String> env = pb.environment();
            // This is needed for Jenkins
            env.put("BUILD_ID", "dontKillMe");
            pb.redirectErrorStream(true).start().waitFor(RESTART_TIMEOUT.asMillis(), TimeUnit.MILLISECONDS);
            if (!waitUntilIsRunning(RESTART_TIMEOUT)) {
                throw new IllegalStateException(
                        String.format("WDA server has failed to start after %s timeout on server '%s'.\n"
                                        + "Please make sure that iDevice is properly connected and you can build "
                                        + "WDA manually from XCode.\n"
                                        + "Xcodebuild logs:\n\n%s\n\n\niproxy logs:\n\n%s\n\n\n",
                                RESTART_TIMEOUT, hostname,
                                getLog(XCODEBUILD_LOG).orElse("EMPTY"), getLog(IPROXY_LOG).orElse("EMPTY"))
                );
            }

            log.info(String.format("WDA server has been successfully (re)started after %s " +
                    "and now is listening on %s:%s", Timedelta.now().diff(started).toString(), hostname, PORT));
        } finally {
            scriptFile.delete();
        }
    }

    public boolean isRunning() throws Exception {
        final boolean result = waitUntilIsRunning(Timedelta.ofSeconds(3));
        if (isRealDevice) {
            return result && UnixProcessHelpers.isProcessRunning(IPROXY_EXECUTABLE.getName());
        }
        return result;
    }

    public Optional<String> getLog(File logFile) {
        if (logFile.exists()) {
            try {
                return Optional.of(new String(Files.readAllBytes(logFile.toPath()), Charset.forName("UTF-8")));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
        return Optional.empty();
    }

    public void resetLogs() {
        for (File logFile : new File[]{XCODEBUILD_LOG, IPROXY_LOG}) {
            if (logFile.exists()) {
                try {
                    final PrintWriter writer = new PrintWriter(logFile);
                    writer.print("");
                    writer.close();
                } catch (FileNotFoundException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

One should call this piece of code before to start Appium iOS driver, for example, in setUp method:

```java
   if (!WDAServer.getInstance().isRunning()) {
       WDAServer.getInstance().restart();
   }
```

It is important to set **webDriverAgentUrl** capability for Appium driver to let it know
that our WDA driver is ready for use:

```java
    capabilities.setCapability("webDriverAgentUrl", WDAServer.SERVER_URL);
```


### Important Notes

 * The process does not have direct access to keychain if it is executed by Jenkins agent,
 so we need to prepare keychain before compiling WDA for real device, otherwise codesigning will fail
 * We kill xcodebuild and iproxy processes before restart to make sure compilation succeeds even
 if these are frozen
 * We prepare a separate bash script and detach iproxy/xcodebuild processes, so they can continue
 running in background even after the actual code execution is finished. This is extremely important
 if multiple tests/suites are executed on the same machine/node in automation lab, which requires minimum
 human interaction
 * The value of _BUILD_ID_ environment variable is changed to avoid killing of the background process
 by Jenkins agent after the job is finished
 * _isRunning_ check is done by verifying the actual network endpoint
 * The output of daemonized processes is logged, so it is possible to track errors and unexpected failures.
 The content of the log files is automatically added to the actual error message if the server fails to (re)start.
 * Real device id can be parsed from `system_profiler SPUSBDataType` output
 * Simulator id can be parsed from `xcrun simctl list` output
 * _UrlChecker_ class is imported from org.openqa.selenium.net package
