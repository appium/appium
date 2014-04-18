# Android Coverage

Android coverage requires the emulator or a rooted device. Build your app
using the instrument target, for example `$ ant instrument`

Pass `androidCoverage` to your device capabilities and set it to your
instrumentation class.

```ruby
caps = { androidCoverage: 'com.example.pkg/com.example.pkg.instrumentation.MyInstrumentation' }
```

Appium will start your app like this:

`adb shell am instrument -e coverage true -w com.example.pkg/com.example.pkg.instrumentation.MyInstrumentation`

After your test completes, it's time to end the coverage collection and pull
the coverage.ec file from the device.

```ruby
mobile :endCoverage, intent: 'com.example.pkg.END_EMMA', path: '/mnt/sdcard/coverage.ec'
```

`AndroidManifest.xml` defines the instrumentation and broadcast receiver.

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

`EndEmmaBroadcast.java` is defined as:

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

`MyInstrumentation.java` is defined as:

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

## Coverage Reports

`ant instrument` generates a `coverage.em` file. The `mobile :endCoverage`
will download the coverage.ec file for that particular run. Note that you can
 have any number of coverage.ec files. To merge them all together into a
 report, use this command:

> java -cp /path/to/android-sdk-macosx/tools/lib/emma_device.jar emma report -r html -in coverage.em,coverage0.ec,coverage1.ec -sp /path/to/your-app/src