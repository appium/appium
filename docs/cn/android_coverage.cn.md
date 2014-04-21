# Android Coverage

Android 覆盖率需要使用模拟器或者 root 过的机器。使用 instrument target 构建应用，比如 `$ ant instrument`

将 `androidCoverage` 传给你设备的 capabilities，并设置为你的 instrument 的 class。
比如

```ruby
caps = { androidCoverage: 'com.example.pkg/com.example.pkg.instrumentation.MyInstrumentation' }
```

Appium 会用类似的命令启动应用：`adb shell am instrument -e coverage true -w com.example.pkg/com.example.pkg.instrumentation.MyInstrumentation`

当你的测试完成时，我们就可以结束覆盖率收集，然后将 coverage.ec 文件从设备里取出来。

```ruby
mobile :endCoverage, intent: 'com.example.pkg.END_EMMA', path: '/mnt/sdcard/coverage.ec'
```

在 `AndroidManifest.xml` 里定义 instrumentation 和 broadcast 接收器。

```xml
    <instrumentation
        android:name="com.example.pkg.instrumentation.MyInstrumentation"
        android:targetPackage="com.example.pkg" >
    </instrumentation>

    <!-- adb shell am broadcast -a com.example.pkg.END_EMMA -->
    <receiver android:name="com.example.pkg.instrumentation.EndEmmaBroadcast" >
       <intent-filter>
           <action android:name="com.example.pkg.END_EMMA" />
       </intent-filter>
    </receiver>
```

再定义 `EndEmmaBroadcast.java` ：

```java
package com.example.pkg.instrumentation;

import java.io.File;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Process;
import android.util.Log;

// adb shell am broadcast -a com.example.pkg.END_EMMA
@SuppressLint("SdCardPath")
public class EndEmmaBroadcast extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d("AppiumEmma", "EndEmmaBroadcast broadcast received!");
        // reflection is used so emma doesn't cause problems for other build targets
        // that do not include emma.
        try {
            Class.forName("com.vladium.emma.rt.RT")
                    .getMethod("dumpCoverageData", File.class, boolean.class, boolean.class)
                    .invoke(null, new File("/mnt/sdcard/coverage.ec"), false, false);
        } catch (Exception e) {
            Log.d("AppiumEmma", e.toString());
        }

        // once coverage is dumped, the processes is ended.
        Process.killProcess(Process.myPid());
    }
}
```

定义 `MyInstrumentation.java`：

```java
package com.example.pkg.instrumentation;

import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.support.v4.content.LocalBroadcastManager;

public class MyInstrumentation extends Instrumentation {
    private Intent intent;

    @Override
    public void onCreate(Bundle arguments) {
        intent = getTargetContext().getPackageManager()
                .getLaunchIntentForPackage("com.example.pkg")
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        start(); // creates new thread which invokes onStart
    }

    @Override
    public void onStart() {
        startActivitySync(intent);
        LocalBroadcastManager.getInstance(getTargetContext()).registerReceiver(
                new EndEmmaBroadcast(), new IntentFilter("com.example.pkg.END_EMMA"));
    }
}
```

### 报表

`ant instrument` 命令会生成一个 `coverage.em` 文件。你可以使用 `mobile :endCoverage` 命令来可以下载 某次运行的 coverage.ec 文件。 注意：你可以有很多个 coverage.ec 文件。你可以用下面的命令将他们合并起来：

> java -cp /path/to/android-sdk-macosx/tools/lib/emma_device.jar emma report -r html -in coverage.em,coverage0.ec,coverage1.ec -sp /path/to/your-app/src
