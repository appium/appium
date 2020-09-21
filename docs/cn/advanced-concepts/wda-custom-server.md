## 如何搭建并定制 WebDriverAgent Server

Appium 的 iOS 版本的后端用的是[Facebook's WebDriverAgent](https://github.com/facebook/WebDriverAgent)。该后端是基于苹果公司的 XCTest 框架，所以也有所有XCTest 框架已知的问题。其中有些问题我们正在设法解决，有一些在现阶段可能无法解决。本文中描述的方法已经能够使您完全掌握在设备上如何构建、管理和运行WDA。通过这种方式，您可以在CI环境中对您的自动化测试进行微调，并使其在长期运行的情况下更加稳定。

重点：
 * 如果使用了Appium的默认设置，则不需要如下的步骤。服务器将为您搞定一切，当然你也不能对WDA做太多控制。
 * 对连接的被测设备必须有SSH或物理访问权限。

### 安装WDA

Appium 会自动下载 WebDriverAgent 源码。如果使用 npm 命令（`npm install -g appium`） 安装Appium的话，通常情况下会保存在/usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/WebDriverAgent 目录下。
如果是首次安装的话，还需要下载一些第三方依赖("carthage"工具就是为此准备的: `brew install carthage`):

```bash
cd /usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/WebDriverAgent
./Scripts/bootstrap.sh -d
```

不需要进一步的配置步骤，你就可以在iOS模拟器上执行自动化测试。

如果是在真机上进行测试的话，则需要做更多的设置。参考[real device configuration documentation](https://github.com/appium/appium-xcuitest-driver/blob/master/docs/real-device-config.md) 设置代码签名。另外，你还需要安装iproxy工具。

```bash
npm install -g iproxy
```

为了确保 WDA 源代码配置正确，请执行以下操作：

* 用Xcode打开/usr/local/lib/node_modules/appium/node_modules/appium-xcuitest-driver/WebDriverAgent/WebDriverAgent.xcodeproj
* 选择 "WebDriverAgentRunner" 工程
* 选择要运行自动化测试的真机/模拟器作为构建目标机
* 在主菜单中选择 Product -> Test

Xcode 会成功构建项目并安装到真机/模拟器上，所以您将在苹果系统的桌面上看到 WebDriverAgentRunner 应用程序的图标。

### 启动WDA

WebDriverAgent 应用程序扮演一个 REST 服务的角色，接收外部 API 请求，然后传递给被测应用的原生 XCTest 调用。如果在模拟器上运行你的测试，REST 服务的地址将是localhost，如果在有实际的 IP 地址的真实设备上运行，REST 服务的地址将是实际的 ip 地址。我们使用 iproxy 将网络请求路由到通过 USB 连接的真实设备上，这意味着可以使用这个工具将模拟器和真实设备上的 WDA 网络地址统一。

这个用Java编写的助手类说明了主要的实现细节：

```java
public class WDAServer {
    private static final Logger log = ZLogger.getLog(WDAServer.class.getSimpleName());

    private static final int MAX_REAL_DEVICE_RESTART_RETRIES = 1;
    private static final Timedelta REAL_DEVICE_RUNNING_TIMEOUT = Timedelta.ofMinutes(4);
    private static final Timedelta RESTART_TIMEOUT = Timedelta.ofMinutes(1);

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
    private static final String WDA_CONFIGURATION = "Debug";
    private static final File XCODEBUILD_LOG = new File("/usr/local/var/log/appium/build.log");
    private static final File IPROXY_LOG = new File("/usr/local/var/log/appium/iproxy.log");

    private static final int PORT = 8100;
    public static final String SERVER_URL = String.format("http://127.0.0.1:%d", PORT);

    private static final String[] IPROXY_CMDLINE = new String[]{
            IPROXY_EXECUTABLE.getAbsolutePath(),
            Integer.toString(PORT),
            Integer.toString(PORT),
            String.format("> %s 2>&1 &", IPROXY_LOG.getAbsolutePath())
    };

    private static WDAServer instance = null;
    private final boolean isRealDevice;
    private final String deviceId;
    private final String platformVersion;
    private int failedRestartRetriesCount = 0;

    private WDAServer() {
        try {
            this.isRealDevice = !getIsSimulatorFromConfig(getClass());
            final String udid;
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

    private boolean waitUntilIsRunning(Timedelta timeout) throws Exception {
        final URL status = new URL(SERVER_URL + "/status");
        try {
            if (timeout.asSeconds() > 5) {
                log.debug(String.format("Waiting max %s until WDA server starts responding...", timeout));
            }
            new UrlChecker().waitUntilAvailable(timeout.asMillis(), TimeUnit.MILLISECONDS, status);
            return true;
        } catch (UrlChecker.TimeoutException e) {
            return false;
        }
    }

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
            throw new IllegalStateException(String.format("xcodebuild tool is not detected on the current system at %s",
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
        result.add(String.format("-configuration %s", WDA_CONFIGURATION));
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
        if (isRealDevice && failedRestartRetriesCount >= MAX_REAL_DEVICE_RESTART_RETRIES) {
            throw new IllegalStateException(String.format(
                    "WDA server cannot start on the connected device with udid %s after %s retries. " +
                            "Reboot the device manually and try again", deviceId, MAX_REAL_DEVICE_RESTART_RETRIES));
        }

        final String hostname = InetAddress.getLocalHost().getHostName();
        log.info(String.format("Trying to (re)start WDA server on %s:%s...", hostname, PORT));
        UnixProcessHelpers.killProcessesGracefully(IPROXY_EXECUTABLE.getName(), XCODEBUILD_EXECUTABLE.getName());

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
            new ProcessBuilder("/bin/chmod", "u+x", scriptFile.getCanonicalPath())
                    .redirectErrorStream(true).start().waitFor(5, TimeUnit.SECONDS);
            final ProcessBuilder pb = new ProcessBuilder("/bin/bash", scriptFile.getCanonicalPath());
            final Map<String, String> env = pb.environment();
            // This is needed for Jenkins
            env.put("BUILD_ID", "dontKillMe");
            log.info(String.format("Waiting max %s for WDA to be (re)started on %s:%s...", RESTART_TIMEOUT.toString(),
                    hostname, PORT));
            final Timedelta started = Timedelta.now();
            pb.redirectErrorStream(true).start().waitFor(RESTART_TIMEOUT.asMillis(), TimeUnit.MILLISECONDS);
            if (!waitUntilIsRunning(RESTART_TIMEOUT)) {
                ++failedRestartRetriesCount;
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
        if (!isProcessRunning(XCODEBUILD_EXECUTABLE.getName())
                || (isRealDevice && !isProcessRunning(IPROXY_EXECUTABLE.getName()))) {
            return false;
        }
        return waitUntilIsRunning(isRealDevice ? REAL_DEVICE_RUNNING_TIMEOUT : Timedelta.ofSeconds(3));
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

之前应该调用这段代码来启动 Appium iOS 驱动，例如，在 setUp 方法中：

```java
   if (!WDAServer.getInstance().isRunning()) {
       WDAServer.getInstance().restart();
   }
```

为 Appium 驱动程序设置 webDriverAgentUrl 非常重要，让它知道我们的 WDA 驱动程序可以使用：

```java
    capabilities.setCapability("webDriverAgentUrl", WDAServer.SERVER_URL);
```

### 重要注释

 * 如果是 jenkins agent 执行的，该进程不能直接访问钥匙串（Keychain），所以我们需要在为真实设备编译 WDA 之前准备钥匙串，否则编码将失败。
 * 如果 xcodebuild 和 iproxy 进程已经被冻结，我们在重新启动之前杀死这些进程，以确保编译成功，
 * 我们准备一个单独的 bash 脚本并独立于 iproxy / xcodebuild 进程，所以即使在实际的代码执行完成后，它们也可以在后台继续运行。如果在自动化实验室中的同一机器/节点上执行多个测试/套件，最少的人工干预是非常重要的。
 * 更改 BUILD_ID 环境变量的值以避免在作业完成后由 Jenkins agent 程序杀死后台进程。
 * isRunning 检查是通过验证实际的网络终端来完成的.
 * 守护进程的输出会存入日志，因此可以跟踪错误和意外的故障。如果服务器无法启动/重启，日志文件的内容会自动添加到实际的错误消息中。
 * 真机设备ID可以从 `system_profiler SPUSBDataType` 输出中解析
 * 模拟器ID可以从 `xcrun simctl list` 输出中解析
 * UrlChecker 类是从 org.openqa.selenium.net 包导入的


本文由 simple 翻译，由 lihuazhang 校验。
